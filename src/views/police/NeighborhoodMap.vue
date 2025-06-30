<template>
  <div class="admin-neighborhood-map">
    <div class="admin-header">
      <h1>Police Dashboard - Incident Map</h1>
      <p class="admin-subtitle">View and manage reported incidents</p>
    </div>

    <!-- Incident Filters -->
    <div class="incident-filters">
      <div class="filter-row">
        <label>Status:</label>
        <select v-model="statusFilter" @change="applyFilters">
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      
      <div class="filter-row">
        <label>Type:</label>
        <select v-model="typeFilter" @change="applyFilters">
          <option value="all">All Types</option>
          <option value="theft">Theft</option>
          <option value="vandalism">Vandalism</option>
          <option value="noise">Noise Complaint</option>
          <option value="suspicious">Suspicious Activity</option>
        </select>
      </div>

      <!-- Debug Info -->
      <div class="debug-info">
        <span>Total Incidents: {{ incidents.length }}</span>
        <span>Filtered: {{ filteredIncidents.length }}</span>
      </div>
    </div>

    <!-- Map Container -->
    <div class="map-container">
      <div id="admin-map" class="map-canvas"></div>
    </div>

    <!-- Incident Modal -->
    <div v-if="selectedIncident" class="modal-overlay" @click="closeIncidentModal">
      <div class="incident-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedIncident.title }}</h3>
          <button @click="closeIncidentModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="incident-details">
            <div class="detail-item">
              <label>Type:</label>
              <span>{{ selectedIncident.type }}</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span class="status-badge" :class="selectedIncident.status">{{ selectedIncident.status }}</span>
            </div>
            <div class="detail-item">
              <label>Location:</label>
              <span>{{ getLocationString(selectedIncident) }}</span>
            </div>
            <div class="detail-item">
              <label>Reported:</label>
              <span>{{ formatDateTime(selectedIncident.createdAt) }}</span>
            </div>
          </div>
          
          <div class="incident-description">
            <h4>Description:</h4>
            <p>{{ selectedIncident.description || 'No description provided' }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="updateStatus('pending')" class="action-button pending" v-if="selectedIncident.status === 'open'">
            Mark as Pending
          </button>
          <button @click="updateStatus('resolved')" class="action-button resolved" v-if="selectedIncident.status !== 'resolved'">
            Mark as Resolved
          </button>
          <button @click="updateStatus('open')" class="action-button open" v-if="selectedIncident.status === 'resolved'">
            Reopen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from '../../services/firebase'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  doc,
  updateDoc,
  limit
} from 'firebase/firestore'

export default {
  name: 'AdminNeighborhoodMap',
  setup() {
    // Reactive data
    const incidents = ref([])
    const map = ref(null)
    const selectedIncident = ref(null)
    const incidentMarkers = ref([])
    const isLoading = ref(true)
    const error = ref(null)
    
    // Filters
    const statusFilter = ref('all')
    const typeFilter = ref('all')
    
    let unsubscribe = null

    // Computed filtered incidents
    const filteredIncidents = computed(() => {
      return incidents.value.filter(incident => {
        const statusMatch = statusFilter.value === 'all' || incident.status === statusFilter.value
        const typeMatch = typeFilter.value === 'all' || incident.type === typeFilter.value
        return statusMatch && typeMatch
      })
    })

    onMounted(async () => {
      try {
        await loadGoogleMaps()
        initializeMap()
        loadIncidents()
      } catch (err) {
        error.value = 'Failed to initialize map: ' + err.message
        console.error('Initialization error:', err)
      }
    })

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe()
      }
    })

    // Load Google Maps API
    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBux3LWgjt4Y2pz0vOoF0TBz4K49BWfzlY&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    // Initialize map
    const initializeMap = () => {
      const defaultCenter = { lat: -1.2921, lng: 36.8219 } // Default to Nairobi coordinates
      
      map.value = new google.maps.Map(document.getElementById('admin-map'), {
        zoom: 12,
        center: defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      })

      console.log('Map initialized successfully')
    }

    // Load incidents from Firestore
    const loadIncidents = () => {
      try {
        const incidentsQuery = query(
          collection(db, 'incidents'),
          orderBy('createdAt', 'desc'),
          limit(100)
        )

        unsubscribe = onSnapshot(incidentsQuery, (snapshot) => {
          console.log('Firestore snapshot received, documents:', snapshot.docs.length)
          
          const incidentData = snapshot.docs.map(doc => {
            const data = doc.data()
            console.log('Incident data:', { id: doc.id, ...data })
            return {
              id: doc.id,
              ...data
            }
          })
          
          incidents.value = incidentData
          isLoading.value = false
          
          console.log('Total incidents loaded:', incidents.value.length)
          updateMapMarkers()
        }, (err) => {
          console.error('Error loading incidents:', err)
          error.value = 'Failed to load incidents: ' + err.message
          isLoading.value = false
        })
      } catch (err) {
        console.error('Error setting up incidents listener:', err)
        error.value = 'Failed to set up data listener: ' + err.message
        isLoading.value = false
      }
    }

    // Extract coordinates from various possible location formats
    const getCoordinates = (incident) => {
      // Try different possible location formats
      if (incident.location) {
        // Format 1: { location: { latitude: x, longitude: y } }
        if (incident.location.latitude && incident.location.longitude) {
          return {
            lat: incident.location.latitude,
            lng: incident.location.longitude
          }
        }
        
        // Format 2: { location: { lat: x, lng: y } }
        if (incident.location.lat && incident.location.lng) {
          return {
            lat: incident.location.lat,
            lng: incident.location.lng
          }
        }
        
        // Format 3: GeoPoint
        if (incident.location._lat && incident.location._long) {
          return {
            lat: incident.location._lat,
            lng: incident.location._long
          }
        }
      }
      
      // Format 4: Direct properties
      if (incident.latitude && incident.longitude) {
        return {
          lat: incident.latitude,
          lng: incident.longitude
        }
      }
      
      if (incident.lat && incident.lng) {
        return {
          lat: incident.lat,
          lng: incident.lng
        }
      }
      
      return null
    }

    // Update markers on map
    const updateMapMarkers = () => {
      if (!map.value) {
        console.log('Map not ready yet')
        return
      }

      // Clear existing markers
      incidentMarkers.value.forEach(marker => marker.setMap(null))
      incidentMarkers.value = []

      const filtered = filteredIncidents.value
      console.log('Updating markers for', filtered.length, 'filtered incidents')

      let validIncidents = 0
      
      // Add new markers
      filtered.forEach((incident, index) => {
        const coords = getCoordinates(incident)
        
        if (!coords) {
          console.log(`Incident ${incident.id} has no valid coordinates:`, incident)
          return
        }

        console.log(`Creating marker for incident ${incident.id} at:`, coords)
        
        try {
          const marker = new google.maps.Marker({
            position: coords,
            map: map.value,
            title: incident.title || `Incident ${incident.id}`,
            icon: getMarkerIcon(incident)
          })

          marker.addListener('click', () => {
            console.log('Marker clicked for incident:', incident.id)
            selectedIncident.value = incident
          })

          incidentMarkers.value.push(marker)
          validIncidents++
        } catch (err) {
          console.error(`Error creating marker for incident ${incident.id}:`, err)
        }
      })

      console.log(`Successfully created ${validIncidents} markers out of ${filtered.length} incidents`)

      // Adjust map bounds if we have markers
      if (incidentMarkers.value.length > 0) {
        const bounds = new google.maps.LatLngBounds()
        incidentMarkers.value.forEach(marker => {
          bounds.extend(marker.getPosition())
        })
        map.value.fitBounds(bounds)
        
        // Don't zoom in too much if there's only one marker
        if (incidentMarkers.value.length === 1) {
          map.value.setZoom(15)
        }
      }
    }

    // Get appropriate marker icon based on incident
    const getMarkerIcon = (incident) => {
      const color = 
        incident.status === 'resolved' ? '#28a745' :   // Green
        incident.status === 'pending' ? '#ffc107' :    // Orange/Yellow
        '#dc3545'  // Red for open or unknown status
      
      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10
      }
    }

    // Apply filters
    const applyFilters = () => {
      console.log('Applying filters - Status:', statusFilter.value, 'Type:', typeFilter.value)
      updateMapMarkers()
    }

    // Get location string for display
    const getLocationString = (incident) => {
      const coords = getCoordinates(incident)
      if (coords) {
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
      }
      return incident.address || 'Location not specified'
    }

    // Format date for display
    const formatDateTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      
      try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleString()
      } catch (err) {
        console.error('Error formatting date:', err)
        return 'Invalid date'
      }
    }

    // Update incident status
    const updateStatus = async (newStatus) => {
      if (!selectedIncident.value) return

      try {
        const incidentRef = doc(db, 'incidents', selectedIncident.value.id)
        await updateDoc(incidentRef, {
          status: newStatus,
          updatedAt: new Date()
        })
        
        // Update local data
        selectedIncident.value.status = newStatus
        const index = incidents.value.findIndex(i => i.id === selectedIncident.value.id)
        if (index !== -1) {
          incidents.value[index].status = newStatus
        }
        
        // Update markers to reflect new status
        updateMapMarkers()
        
        console.log(`Incident ${selectedIncident.value.id} status updated to ${newStatus}`)
      } catch (error) {
        console.error('Error updating incident:', error)
        alert('Failed to update incident status. Please try again.')
      }
    }

    // Close incident modal
    const closeIncidentModal = () => {
      selectedIncident.value = null
    }

    return {
      incidents,
      filteredIncidents,
      selectedIncident,
      statusFilter,
      typeFilter,
      isLoading,
      error,
      applyFilters,
      formatDateTime,
      updateStatus,
      closeIncidentModal,
      getLocationString
    }
  }
}
</script>

<style scoped>
.admin-neighborhood-map {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.admin-header {
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.admin-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #212529;
}

.admin-subtitle {
  margin: 0.25rem 0 0;
  color: #6c757d;
}

.incident-filters {
  padding: 1rem;
  background: #fff;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-row label {
  font-weight: 500;
  color: #495057;
}

select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ced4da;
  background: #fff;
  min-width: 120px;
}

.debug-info {
  display: flex;
  gap: 1rem;
  margin-left: auto;
  font-size: 0.9rem;
  color: #6c757d;
}

.debug-info span {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
}

.map-container {
  flex: 1;
  position: relative;
  min-height: 400px;
}

.map-canvas {
  height: 100%;
  width: 100%;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.incident-modal {
  background: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #212529;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.5rem;
  color: #6c757d;
  border-radius: 3px;
}

.close-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.modal-body {
  padding: 1rem;
}

.incident-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-item label {
  font-weight: 500;
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 0.25rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: uppercase;
  display: inline-block;
  width: fit-content;
}

.status-badge.open {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.resolved {
  background: #d4edda;
  color: #155724;
}

.incident-description {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.incident-description h4 {
  margin: 0 0 0.5rem;
  color: #495057;
}

.incident-description p {
  margin: 0;
  color: #212529;
  line-height: 1.5;
}

.modal-actions {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  background: #f8f9fa;
}

.action-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-button.pending {
  background: #ffc107;
  color: #212529;
}

.action-button.pending:hover {
  background: #e0a800;
}

.action-button.resolved {
  background: #28a745;
  color: white;
}

.action-button.resolved:hover {
  background: #218838;
}

.action-button.open {
  background: #dc3545;
  color: white;
}

.action-button.open:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .incident-details {
    grid-template-columns: 1fr;
  }
  
  .incident-filters {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .debug-info {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}</style>