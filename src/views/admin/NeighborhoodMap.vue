<template>
  <div class="admin-neighborhood-map">
    <div class="admin-header">
      <h1>Admin Dashboard - Incident Map</h1>
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
        <span>Valid Coordinates: {{ validCoordinateCount }}</span>
        <span>Map Ready: {{ mapReady ? 'Yes' : 'No' }}</span>
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading" class="loading-indicator">
      Loading incidents...
    </div>

    <!-- Error display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Map Container -->
    <div class="map-container">
      <div id="admin-map" class="map-canvas"></div>
    </div>

    <!-- Incident Modal -->
    <div v-if="selectedIncident" class="modal-overlay" @click="closeIncidentModal">
      <div class="incident-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedIncident.title || 'Incident #' + selectedIncident.id }}</h3>
          <button @click="closeIncidentModal" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="incident-details">
            <div class="detail-item">
              <label>Type:</label>
              <span>{{ selectedIncident.type || 'Not specified' }}</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span class="status-badge" :class="selectedIncident.status">{{ selectedIncident.status || 'open' }}</span>
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

          <!-- Debug section for incident data -->
          <div class="incident-debug" v-if="showDebug">
            <h4>Debug Info:</h4>
            <pre>{{ JSON.stringify(selectedIncident, null, 2) }}</pre>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="toggleDebug" class="action-button debug">Toggle Debug</button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { db } from '../../services/firebase'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  doc,
  updateDoc,
  getDocs
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
    const mapReady = ref(false)
    const showDebug = ref(false)
    
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

    // Count incidents with valid coordinates
    const validCoordinateCount = computed(() => {
      return filteredIncidents.value.filter(incident => getCoordinates(incident) !== null).length
    })

    // Watch for changes in filtered incidents and update map
    watch(filteredIncidents, () => {
      if (mapReady.value) {
        updateMapMarkers()
      }
    }, { deep: true })

    onMounted(async () => {
      try {
        console.log('Starting initialization...')
        await loadGoogleMaps()
        initializeMap()
        await loadIncidents()
      } catch (err) {
        error.value = 'Failed to initialize: ' + err.message
        console.error('Initialization error:', err)
        isLoading.value = false
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
          console.log('Google Maps already loaded')
          resolve()
          return
        }

        console.log('Loading Google Maps API...')
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBux3LWgjt4Y2pz0vOoF0TBz4K49BWfzlY&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => {
          console.log('Google Maps API loaded successfully')
          resolve()
        }
        script.onerror = (err) => {
          console.error('Failed to load Google Maps API:', err)
          reject(new Error('Failed to load Google Maps API'))
        }
        document.head.appendChild(script)
      })
    }

    // Initialize map
    const initializeMap = () => {
      const defaultCenter = { lat: -1.2921, lng: 36.8219 } // Nairobi coordinates
      
      const mapElement = document.getElementById('admin-map')
      if (!mapElement) {
        throw new Error('Map element not found')
      }

      map.value = new google.maps.Map(mapElement, {
        zoom: 12,
        center: defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
      })

      mapReady.value = true
      console.log('Map initialized successfully')
    }

    // Load incidents from Firestore
    const loadIncidents = async () => {
      try {
        console.log('Setting up Firestore listener...')
        
        // First try to get all incidents without limit to see total count
        const allIncidentsQuery = query(
          collection(db, 'incidents'),
          orderBy('createdAt', 'desc')
        )

        // Test connection first with getDocs
        try {
          const snapshot = await getDocs(query(collection(db, 'incidents')))
          console.log('Direct query test - found documents:', snapshot.docs.length)
          
          if (snapshot.docs.length === 0) {
            console.warn('No documents found in incidents collection')
            error.value = 'No incidents found in database'
            isLoading.value = false
            return
          }
          
          // Log first document structure for debugging
          if (snapshot.docs.length > 0) {
            const firstDoc = snapshot.docs[0]
            console.log('First document structure:', { id: firstDoc.id, data: firstDoc.data() })
          }
        } catch (testError) {
          console.error('Test query failed:', testError)
          error.value = 'Failed to connect to database: ' + testError.message
          isLoading.value = false
          return
        }

        // Set up real-time listener
        unsubscribe = onSnapshot(allIncidentsQuery, (snapshot) => {
          console.log('Firestore snapshot received, documents:', snapshot.docs.length)
          
          if (snapshot.empty) {
            console.warn('Snapshot is empty')
            incidents.value = []
            isLoading.value = false
            return
          }
          
          const incidentData = []
          
          snapshot.docs.forEach((doc, index) => {
            const data = doc.data()
            const incident = {
              id: doc.id,
              ...data,
              // Ensure status has a default
              status: data.status || 'open'
            }
            
            console.log(`Processing incident ${index + 1}/${snapshot.docs.length}:`, {
              id: incident.id,
              type: incident.type,
              status: incident.status,
              hasLocation: !!getCoordinates(incident),
              coordinates: getCoordinates(incident),
              rawLocation: data.location
            })
            
            incidentData.push(incident)
          })
          
          incidents.value = incidentData
          isLoading.value = false
          
          console.log(`Successfully loaded ${incidents.value.length} incidents`)
          console.log('Incidents with valid coordinates:', incidents.value.filter(i => getCoordinates(i)).length)
          
          // Update map markers if map is ready
          if (mapReady.value) {
            updateMapMarkers()
          }
        }, (err) => {
          console.error('Firestore listener error:', err)
          error.value = 'Failed to load incidents: ' + err.message
          isLoading.value = false
        })
      } catch (err) {
        console.error('Error setting up incidents listener:', err)
        error.value = 'Failed to set up data listener: ' + err.message
        isLoading.value = false
      }
    }

    // Enhanced coordinate extraction with better error handling
    const getCoordinates = (incident) => {
      if (!incident) {
        console.log('No incident provided to getCoordinates')
        return null
      }

      try {
        // Format 1: location object with latitude/longitude
        if (incident.location) {
          // Handle Firestore GeoPoint
          if (incident.location.latitude !== undefined && incident.location.longitude !== undefined) {
            const lat = parseFloat(incident.location.latitude)
            const lng = parseFloat(incident.location.longitude)
            if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
              return { lat, lng }
            }
          }
          
          // Handle lat/lng format
          if (incident.location.lat !== undefined && incident.location.lng !== undefined) {
            const lat = parseFloat(incident.location.lat)
            const lng = parseFloat(incident.location.lng)
            if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
              return { lat, lng }
            }
          }
          
          // Handle Firestore GeoPoint internal format
          if (incident.location._lat !== undefined && incident.location._long !== undefined) {
            const lat = parseFloat(incident.location._lat)
            const lng = parseFloat(incident.location._long)
            if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
              return { lat, lng }
            }
          }
        }
        
        // Format 2: Direct properties on incident
        if (incident.latitude !== undefined && incident.longitude !== undefined) {
          const lat = parseFloat(incident.latitude)
          const lng = parseFloat(incident.longitude)
          if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
            return { lat, lng }
          }
        }
        
        if (incident.lat !== undefined && incident.lng !== undefined) {
          const lat = parseFloat(incident.lat)
          const lng = parseFloat(incident.lng)
          if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
            return { lat, lng }
          }
        }

        // Format 3: coordinates array [lng, lat] (GeoJSON format)
        if (Array.isArray(incident.coordinates) && incident.coordinates.length >= 2) {
          const lng = parseFloat(incident.coordinates[0])
          const lat = parseFloat(incident.coordinates[1])
          if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
            return { lat, lng }
          }
        }

        // Format 4: position object
        if (incident.position) {
          if (incident.position.lat !== undefined && incident.position.lng !== undefined) {
            const lat = parseFloat(incident.position.lat)
            const lng = parseFloat(incident.position.lng)
            if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
              return { lat, lng }
            }
          }
        }

        console.log(`No valid coordinates found for incident ${incident.id}:`, {
          location: incident.location,
          latitude: incident.latitude,
          longitude: incident.longitude,
          lat: incident.lat,
          lng: incident.lng,
          coordinates: incident.coordinates,
          position: incident.position
        })
        
      } catch (err) {
        console.error(`Error extracting coordinates for incident ${incident.id}:`, err)
      }
      
      return null
    }

    // Validate coordinates are reasonable
    const isValidCoordinate = (lat, lng) => {
      return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && 
             lat !== 0 && lng !== 0 // Exclude 0,0 as it's likely invalid
    }

    // Update markers on map
    const updateMapMarkers = () => {
      if (!map.value || !mapReady.value) {
        console.log('Map not ready for marker updates')
        return
      }

      console.log('Updating map markers...')

      // Clear existing markers
      incidentMarkers.value.forEach(marker => {
        try {
          marker.setMap(null)
        } catch (err) {
          console.error('Error removing marker:', err)
        }
      })
      incidentMarkers.value = []

      const filtered = filteredIncidents.value
      console.log(`Processing ${filtered.length} filtered incidents for markers`)

      let validIncidents = 0
      const bounds = new google.maps.LatLngBounds()
      
      // Add new markers
      filtered.forEach((incident, index) => {
        const coords = getCoordinates(incident)
        
        if (!coords) {
          console.log(`Skipping incident ${incident.id} - no valid coordinates`)
          return
        }

        console.log(`Creating marker ${index + 1} for incident ${incident.id} at:`, coords)
        
        try {
          const marker = new google.maps.Marker({
            position: coords,
            map: map.value,
            title: incident.title || `Incident ${incident.id}`,
            icon: getMarkerIcon(incident),
            animation: google.maps.Animation.DROP
          })

          // Add click listener
          marker.addListener('click', () => {
            console.log('Marker clicked for incident:', incident.id)
            selectedIncident.value = incident
          })

          incidentMarkers.value.push(marker)
          bounds.extend(coords)
          validIncidents++
          
        } catch (err) {
          console.error(`Error creating marker for incident ${incident.id}:`, err)
        }
      })

      console.log(`Successfully created ${validIncidents} markers out of ${filtered.length} incidents`)

      // Adjust map view if we have markers
      if (validIncidents > 0) {
        try {
          if (validIncidents === 1) {
            // Single marker - center on it with reasonable zoom
            map.value.setCenter(incidentMarkers.value[0].getPosition())
            map.value.setZoom(15)
          } else {
            // Multiple markers - fit bounds
            map.value.fitBounds(bounds)
            
            // Ensure minimum zoom level
            const listener = google.maps.event.addListener(map.value, 'bounds_changed', () => {
              if (map.value.getZoom() > 18) {
                map.value.setZoom(18)
              }
              google.maps.event.removeListener(listener)
            })
          }
        } catch (err) {
          console.error('Error adjusting map bounds:', err)
        }
      } else {
        console.log('No valid markers to display - keeping default view')
      }
    }

    // Get appropriate marker icon based on incident
    const getMarkerIcon = (incident) => {
      const status = incident.status || 'open'
      
      const color = 
        status === 'resolved' ? '#28a745' :   // Green
        status === 'pending' ? '#ffc107' :    // Orange/Yellow
        '#dc3545'  // Red for open or unknown status
      
      return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 12
      }
    }

    // Apply filters
    const applyFilters = () => {
      console.log('Applying filters - Status:', statusFilter.value, 'Type:', typeFilter.value)
      // Markers will be updated automatically via the watcher
    }

    // Get location string for display
    const getLocationString = (incident) => {
      const coords = getCoordinates(incident)
      if (coords) {
        return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
      }
      return incident.address || incident.locationName || 'Location not specified'
    }

    // Format date for display
    const formatDateTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      
      try {
        // Handle Firestore timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        return date.toLocaleString()
      } catch (err) {
        console.error('Error formatting date:', err, timestamp)
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

    // Toggle debug view
    const toggleDebug = () => {
      showDebug.value = !showDebug.value
    }

    return {
      incidents,
      filteredIncidents,
      selectedIncident,
      statusFilter,
      typeFilter,
      isLoading,
      error,
      mapReady,
      validCoordinateCount,
      showDebug,
      applyFilters,
      formatDateTime,
      updateStatus,
      closeIncidentModal,
      getLocationString,
      toggleDebug
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
  flex-wrap: wrap;
}

.debug-info span {
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  white-space: nowrap;
}

.loading-indicator {
  padding: 2rem;
  text-align: center;
  color: #6c757d;
  background: #f8f9fa;
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  margin: 1rem;
  border-radius: 4px;
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
  max-width: 600px;
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

.incident-debug {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #dee2e6;
}

.incident-debug h4 {
  margin: 0 0 0.5rem;
  color: #495057;
}

.incident-debug pre {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.8rem;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.modal-actions {
  padding: 1rem;
  border-top: 1px solid #dee2e6;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  background: #f8f9fa;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  font-size: 0.9rem;
}

.action-button.debug {
  background: #6c757d;
  color: white;
}

.action-button.debug:hover {
  background: #5a6268;
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
  
  .modal-actions {
    justify-content: center;
  }
}</style>