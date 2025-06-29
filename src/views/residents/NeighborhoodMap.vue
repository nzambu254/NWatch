<template>
  <div class="neighborhood-map">
    <div class="map-header">
      <h1>Neighborhood Map</h1>
      <p class="map-subtitle">Interactive community safety and incident visualization</p>
    </div>

    <div class="map-controls">
      <div class="control-section">
        <h3>🔍 Filters</h3>
        <div class="filter-group">
          <div class="filter-item">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="showIncidents"
                @change="toggleIncidentMarkers"
              >
              <span class="checkmark"></span>
              Show Incidents ({{ incidents.length }})
            </label>
          </div>

          <div class="filter-item">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="showPOIs"
                @change="togglePOIMarkers"
              >
              <span class="checkmark"></span>
              Points of Interest ({{ pointsOfInterest.length }})
            </label>
          </div>

          <div class="filter-item">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="showHeatmap"
                @change="toggleHeatmap"
              >
              <span class="checkmark"></span>
              Crime Heatmap
            </label>
          </div>
        </div>
      </div>

      <div class="control-section">
        <h3>🎯 Incident Types</h3>
        <div class="incident-types">
          <div
            v-for="type in incidentTypes"
            :key="type.key"
            class="incident-type-item"
            :class="{ active: selectedIncidentTypes.includes(type.key) }"
            @click="toggleIncidentType(type.key)"
          >
            <span class="type-icon">{{ type.icon }}</span>
            <span class="type-label">{{ type.label }}</span>
            <span class="type-count">{{ getIncidentCount(type.key) }}</span>
          </div>
        </div>
      </div>

      <div class="control-section">
        <h3>📊 Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ totalIncidents }}</div>
            <div class="stat-label">Total Incidents</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ recentIncidents }}</div>
            <div class="stat-label">This Week</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ highUrgencyIncidents }}</div>
            <div class="stat-label">High Priority</div>
          </div>
        </div>
      </div>
    </div>

    <div class="map-container">
      <div id="map" class="map-canvas"></div>

      <div v-if="mapLoading" class="map-loading">
        <div class="loading-spinner"></div>
        <p>Loading neighborhood map...</p>
      </div>

      <div class="map-legend" v-if="!mapLoading">
        <h4>Legend</h4>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-marker incident-marker"></div>
            <span>Recent Incidents</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker poi-marker"></div>
            <span>Points of Interest</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker user-marker"></div>
            <span>Your Location</span>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <button
          @click="centerOnUserLocation"
          class="action-btn location-btn"
          title="Center on my location"
        >
          📍
        </button>
        <button
          @click="reportIncident"
          class="action-btn report-btn"
          title="Report new incident"
        >
          🚨
        </button>
        <button
          @click="toggleSatelliteView"
          class="action-btn satellite-btn"
          title="Toggle satellite view"
        >
          🛰️
        </button>
      </div>
    </div>

    <div v-if="selectedIncident" class="modal-overlay" @click="closeIncidentModal">
      <div class="incident-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedIncident.title }}</h3>
          <button @click="closeIncidentModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="incident-info">
            <div class="info-row">
              <span class="info-label">Type:</span>
              <span class="info-value">{{ formatIncidentType(selectedIncident.type) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span :class="'status-badge status-' + selectedIncident.status">
                {{ formatStatus(selectedIncident.status) }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Urgency:</span>
              <span :class="'urgency-badge urgency-' + selectedIncident.urgency">
                {{ selectedIncident.urgency ? selectedIncident.urgency.toUpperCase() : 'N/A' }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Location:</span>
              <span class="info-value">{{ selectedIncident.location }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">{{ formatDateTime(selectedIncident.createdAt) }}</span>
            </div>
          </div>

          <div class="incident-description">
            <h4>Description:</h4>
            <p>{{ selectedIncident.description }}</p>
          </div>

          <div v-if="selectedIncident.evidenceUrls && selectedIncident.evidenceUrls.length > 0" class="incident-evidence">
            <h4>Evidence:</h4>
            <div class="evidence-thumbnails">
              <img
                v-for="(url, index) in selectedIncident.evidenceUrls"
                :key="index"
                :src="url"
                :alt="'Evidence ' + (index + 1)"
                @click="openLightbox(url)"
                class="evidence-thumb"
              >
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="getDirections(selectedIncident)" class="action-button directions-btn">
            🗺️ Get Directions
          </button>
          <button @click="shareIncident(selectedIncident)" class="action-button share-btn">
            📤 Share
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedPOI" class="modal-overlay" @click="closePOIModal">
      <div class="poi-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedPOI.name }}</h3>
          <button @click="closePOIModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="poi-info">
            <div class="info-row">
              <span class="info-label">Type:</span>
              <span class="info-value">{{ selectedPOI.type }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">{{ selectedPOI.address }}</span>
            </div>
            <div v-if="selectedPOI.phone" class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">{{ selectedPOI.phone }}</span>
            </div>
            <div v-if="selectedPOI.hours" class="info-row">
              <span class="info-label">Hours:</span>
              <span class="info-value">{{ selectedPOI.hours }}</span>
            </div>
          </div>

          <div v-if="selectedPOI.description" class="poi-description">
            <h4>Description:</h4>
            <p>{{ selectedPOI.description }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="getDirections(selectedPOI)" class="action-button directions-btn">
            🗺️ Get Directions
          </button>
          <button v-if="selectedPOI.phone" @click="callPOI(selectedPOI)" class="action-button call-btn">
            📞 Call
          </button>
        </div>
      </div>
    </div>

    <div v-if="lightboxImage" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <img :src="lightboxImage" alt="Evidence" class="lightbox-image">
        <button @click="closeLightbox" class="lightbox-close">×</button>
      </div>
    </div>

    <div v-if="showLocationPicker" class="modal-overlay" @click="showLocationPicker = false">
      <div class="location-picker-modal" @click.stop>
        <div class="modal-header">
          <h3>Select Incident Location</h3>
          <button @click="showLocationPicker = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div id="location-picker-map" style="height: 400px; width: 100%;"></div>
          <div v-if="selectedCoordinates" class="coordinates-display">
            <p>Selected Coordinates:</p>
            <p>Latitude: {{ selectedCoordinates.lat.toFixed(6) }}</p>
            <p>Longitude: {{ selectedCoordinates.lng.toFixed(6) }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="confirmLocationSelection" class="action-button confirm-btn">
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, storage } from '../../services/firebase'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

export default {
  name: 'NeighborhoodMap',
  setup() {
    const router = useRouter()

    // Load Google Maps API
    const loadGoogleMaps = () => {
      return new Promise((resolve) => {
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        // Replace 'YOUR_Maps_API_KEY' with your actual Google Maps API key
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBux3LWgjt4Y2pz0vOoF0TBz4K49BWfzlY&libraries=visualization,places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    // Reactive data
    const incidents = ref([])
    const pointsOfInterest = ref([])
    const map = ref(null)
    const mapLoading = ref(true)
    const userLocation = ref(null)
    const selectedIncident = ref(null)
    const selectedPOI = ref(null)
    const lightboxImage = ref(null)
    const selectedCoordinates = ref(null)
    const showLocationPicker = ref(false)

    // Map controls
    const showIncidents = ref(true)
    const showPOIs = ref(true)
    const showHeatmap = ref(false)
    const selectedIncidentTypes = ref(['theft', 'vandalism', 'suspicious_activity', 'noise_complaint', 'parking_violation', 'other'])
    const isSatelliteView = ref(false)

    // Map markers
    const incidentMarkers = ref([])
    const poiMarkers = ref([])
    const userMarker = ref(null)
    const heatmapLayer = ref(null)

    let unsubscribe = null
    let locationPickerMap = null
    let locationPickerMarker = null

    // Incident types configuration
    // These keys should match the 'type' field values in your Firebase incidents
    const incidentTypes = ref([
      { key: 'theft', label: 'Theft', icon: '🔓' },
      { key: 'vandalism', label: 'Vandalism', icon: '🎨' },
      { key: 'suspicious_activity', label: 'Suspicious Activity', icon: '👁️' },
      { key: 'noise_complaint', label: 'Noise Complaint', icon: '🔊' },
      { key: 'parking_violation', label: 'Parking Violation', icon: '🚗' },
      { key: 'other', label: 'Other', icon: '❓' }
    ])

    // Sample Points of Interest (in real app, these would come from a database)
    const defaultPOIs = ref([
      {
        id: 'poi-1',
        name: 'Central Police Station',
        type: 'Police Station',
        address: '123 Main Street',
        phone: '911',
        lat: -1.2921 + 0.001,
        lng: 36.8219 + 0.001,
        icon: '👮',
        description: '24/7 emergency services and community policing'
      },
      {
        id: 'poi-2',
        name: 'City General Hospital',
        type: 'Hospital',
        address: '456 Health Ave',
        phone: '(555) 123-4567',
        hours: '24/7',
        lat: -1.2921 - 0.002,
        lng: 36.8219 + 0.002,
        icon: '🏥',
        description: 'Full-service hospital with emergency care'
      },
      {
        id: 'poi-3',
        name: 'Community Center',
        type: 'Community Center',
        address: '789 Community Blvd',
        phone: '(555) 987-6543',
        hours: '8 AM - 10 PM',
        lat: -1.2921 + 0.003,
        lng: 36.8219 - 0.001,
        icon: '🏢',
        description: 'Community meetings, events, and neighborhood watch headquarters'
      },
      {
        id: 'poi-4',
        name: 'Fire Station #3',
        type: 'Fire Station',
        address: '321 Fire Lane',
        phone: '911',
        lat: -1.2921 - 0.001,
        lng: 36.8219 - 0.002,
        icon: '🚒',
        description: 'Emergency fire and rescue services'
      },
      {
        id: 'poi-5',
        name: 'Central Park',
        type: 'Park',
        address: 'Park Avenue',
        hours: '6 AM - 8 PM',
        lat: -1.2921,
        lng: 36.8219 + 0.003,
        icon: '🌳',
        description: 'Public park with walking trails and recreational facilities'
      }
    ])

    onMounted(async () => {
      pointsOfInterest.value = defaultPOIs.value // You might load these from Firebase too
      await loadGoogleMaps()
      initializeMap()
      loadIncidents()
      getUserLocation()
    })

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe()
      }
    })

    // Computed properties - DECLARE THESE FIRST
    const totalIncidents = computed(() => incidents.value.length)

    const recentIncidents = computed(() => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return incidents.value.filter(incident => {
        const incidentDate = incident.createdAt.toDate ? incident.createdAt.toDate() : new Date(incident.createdAt)
        return incidentDate >= weekAgo
      }).length
    })

    const highUrgencyIncidents = computed(() =>
      incidents.value.filter(incident => incident.urgency === 'high').length
    )

    const filteredIncidents = computed(() => {
      return incidents.value.filter(incident =>
        selectedIncidentTypes.value.includes(incident.type)
      )
    })

    // Watch for changes - NOW THESE CAN BE DECLARED AFTER THEIR DEPENDENCIES
    watch(filteredIncidents, () => {
      updateIncidentMarkers()
    })
    watch(showIncidents, () => {
      updateIncidentMarkers()
    })
    watch(showPOIs, () => {
      updatePOIMarkers()
    })
    watch(showHeatmap, () => {
      toggleHeatmap()
    })
    // This watch needs to be placed after `showLocationPicker` is defined, which it is.
    watch(showLocationPicker, (newValue) => {
      if (newValue) {
        setTimeout(() => {
          initLocationPickerMap();
        }, 0);
      } else {
        if (locationPickerMarker) {
          locationPickerMarker.setMap(null);
          locationPickerMarker = null;
        }
        selectedCoordinates.value = null;
      }
    });

    // Initialize map
    const initializeMap = () => {
      // Default center (Nairobi, Kenya - adjust as needed)
      const defaultCenter = { lat: -1.2921, lng: 36.8219 }

      // Create map
      map.value = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: defaultCenter,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ],
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: true,
        rotateControl: false,
        fullscreenControl: true
      })

      mapLoading.value = false

      // Initialize heatmap
      heatmapLayer.value = new google.maps.visualization.HeatmapLayer({
        data: [],
        map: null
      })
    }

    // Load incidents from Firestore
    const loadIncidents = () => {
      const incidentsQuery = query(
        collection(db, 'incidents'),
        orderBy('createdAt', 'desc'),
        limit(100) // Limit to recent incidents for performance
      )

      unsubscribe = onSnapshot(incidentsQuery, (snapshot) => {
        incidents.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(incident => incident.lat && incident.lng) // Only incidents with coordinates

        updateIncidentMarkers()
        updateHeatmap()
      }, (error) => {
        console.error('Error loading incidents:', error)
      })
    }

    // Get user's current location
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation.value = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }

            // Create user location marker
            if (userMarker.value) {
              userMarker.value.setMap(null); // Clear existing marker
            }
            userMarker.value = new google.maps.Marker({
              position: userLocation.value,
              map: map.value,
              title: 'Your Location',
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
              }
            })

            // Center map on user location
            map.value.setCenter(userLocation.value)
          },
          (error) => {
            console.error('Error getting user location:', error)
            // Handle error, e.g., display a message to the user
          }
        )
      } else {
        console.warn('Geolocation is not supported by this browser.')
      }
    }

    // Update incident markers on map
    const updateIncidentMarkers = () => {
      // Clear existing markers
      incidentMarkers.value.forEach(marker => marker.setMap(null))
      incidentMarkers.value = []

      if (!showIncidents.value) return

      filteredIncidents.value.forEach(incident => { // This now correctly accesses filteredIncidents
        if (!incident.lat || !incident.lng) return

        const marker = new google.maps.Marker({
          position: { lat: parseFloat(incident.lat), lng: parseFloat(incident.lng) },
          map: map.value,
          title: incident.title,
          icon: {
            url: getIncidentIcon(incident),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        })

        // Add click listener
        marker.addListener('click', () => {
          selectedIncident.value = incident
        })

        incidentMarkers.value.push(marker)
      })
    }

    // Update POI markers on map
    const updatePOIMarkers = () => {
      // Clear existing markers
      poiMarkers.value.forEach(marker => marker.setMap(null))
      poiMarkers.value = []

      if (!showPOIs.value) return

      pointsOfInterest.value.forEach(poi => {
        const marker = new google.maps.Marker({
          position: { lat: poi.lat, lng: poi.lng },
          map: map.value,
          title: poi.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="#34C759" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" font-size="14" fill="white">${poi.icon || '📍'}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        })

        // Add click listener
        marker.addListener('click', () => {
          selectedPOI.value = poi
        })

        poiMarkers.value.push(marker)
      })
    }

    // Update heatmap
    const updateHeatmap = () => {
      if (!heatmapLayer.value) return

      const heatmapData = incidents.value
        .filter(incident => incident.lat && incident.lng)
        .map(incident => ({
          location: new google.maps.LatLng(parseFloat(incident.lat), parseFloat(incident.lng)),
          weight: incident.urgency === 'high' ? 3 : incident.urgency === 'medium' ? 2 : 1
        }))

      heatmapLayer.value.setData(heatmapData)
    }

    // Get incident icon based on type and urgency
    const getIncidentIcon = (incident) => {
      const type = incidentTypes.value.find(t => t.key === incident.type)
      const color = incident.urgency === 'high' ? '#DC3545' :
                    incident.urgency === 'medium' ? '#FFC107' : '#28A745'

      return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2L6 28H26L16 2Z" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="20" text-anchor="middle" font-size="12" fill="white">${type?.icon || '❗'}</text>
        </svg>
      `)
    }

    // Control functions
    const toggleIncidentMarkers = () => {
      updateIncidentMarkers()
    }

    const togglePOIMarkers = () => {
      updatePOIMarkers()
    }

    const toggleHeatmap = () => {
      if (showHeatmap.value) {
        heatmapLayer.value.setMap(map.value)
      } else {
        heatmapLayer.value.setMap(null)
      }
    }

    const toggleIncidentType = (typeKey) => {
      const index = selectedIncidentTypes.value.indexOf(typeKey)
      if (index > -1) {
        selectedIncidentTypes.value.splice(index, 1)
      } else {
        selectedIncidentTypes.value.push(typeKey)
      }
      // Markers will update automatically due to the watcher on filteredIncidents
    }

    const getIncidentCount = (typeKey) => {
      return incidents.value.filter(incident => incident.type === typeKey).length
    }

    // Map actions
    const centerOnUserLocation = () => {
      if (userLocation.value && map.value) {
        map.value.setCenter(userLocation.value)
        map.value.setZoom(16)
      } else {
        getUserLocation()
      }
    }

    const reportIncident = () => {
      router.push('/report-incident')
    }

    const toggleSatelliteView = () => {
      if (map.value) {
        const mapType = isSatelliteView.value ?
          google.maps.MapTypeId.ROADMAP :
          google.maps.MapTypeId.SATELLITE
        map.value.setMapTypeId(mapType)
        isSatelliteView.value = !isSatelliteView.value
      }
    }

    // Modal functions
    const closeIncidentModal = () => {
      selectedIncident.value = null
    }

    const closePOIModal = () => {
      selectedPOI.value = null
    }

    const openLightbox = (imageUrl) => {
      lightboxImage.value = imageUrl
    }

    const closeLightbox = () => {
      lightboxImage.value = null
    }

    // Action functions
    const getDirections = (location) => {
      const destination = location.lat && location.lng ?
        `${location.lat},${location.lng}` :
        encodeURIComponent(location.address || location.location || '')

      const url = `http://maps.google.com/maps?q=${destination}`; // Corrected Google Maps URL for directions
      window.open(url, '_blank')
    }

    const shareIncident = (incident) => {
      if (navigator.share) {
        navigator.share({
          title: incident.title,
          text: incident.description,
          url: window.location.href
        })
      } else {
        const shareText = `${incident.title}\n${incident.description}\nLocation: ${incident.location}`;
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Incident details copied to clipboard!');
        }).catch(err => {
          console.error('Failed to copy: ', err);
          alert('Could not copy incident details to clipboard.');
        });
      }
    }

    const callPOI = (poi) => {
      if (poi.phone) {
        window.location.href = `tel:${poi.phone}`
      }
    }

    // Location Picker Functions
    const initLocationPickerMap = () => {
      const mapElement = document.getElementById('location-picker-map')
      if (!mapElement) {
        console.error('Location picker map element not found!');
        return;
      }
      locationPickerMap = new google.maps.Map(mapElement, {
        zoom: 15,
        center: userLocation.value || { lat: -1.2921, lng: 36.8219 },
        mapTypeId: google.maps.MapTypeId.ROADMAP
      })

      locationPickerMap.addListener('click', (event) => {
        if (locationPickerMarker) {
          locationPickerMarker.setMap(null)
        }

        locationPickerMarker = new google.maps.Marker({
          position: event.latLng,
          map: locationPickerMap,
          title: 'Selected Location'
        })

        selectedCoordinates.value = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        }

        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: event.latLng }, (results, status) => {
          if (status === 'OK' && results[0]) {
            console.log("Selected Address:", results[0].formatted_address);
          }
        })
      })
    }

    const confirmLocationSelection = () => {
      showLocationPicker.value = false
      console.log('Confirmed selected coordinates:', selectedCoordinates.value);
    }

    // Geocoding function
    const geocodeLocation = async (address) => {
      return new Promise((resolve, reject) => {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ address: address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location
            resolve({
              lat: location.lat(),
              lng: location.lng(),
              formattedAddress: results[0].formatted_address
            })
          } else {
            reject(new Error('Geocoding failed: ' + status))
          }
        })
      })
    }

    // Utility functions
    const formatIncidentType = (type) => {
      if (!type) return 'N/A';
      return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatStatus = (status) => {
      const statusMap = {
        'open': 'Open',
        'pending': 'Pending',
        'investigating': 'Investigating',
        'resolved': 'Resolved'
      }
      return statusMap[status] || (status ? status.replace(/\b\w/g, l => l.toUpperCase()) : 'N/A')
    }

    const formatDateTime = (datetime) => {
      if (!datetime) return 'N/A'
      const date = datetime.toDate ? datetime.toDate() : new Date(datetime)
      return date.toLocaleString()
    }

    return {
      incidents,
      pointsOfInterest,
      mapLoading,
      selectedIncident,
      selectedPOI,
      lightboxImage,
      selectedCoordinates,
      showLocationPicker,
      showIncidents,
      showPOIs,
      showHeatmap,
      selectedIncidentTypes,
      incidentTypes,
      totalIncidents,
      recentIncidents,
      highUrgencyIncidents,
      toggleIncidentMarkers,
      togglePOIMarkers,
      toggleHeatmap,
      toggleIncidentType,
      getIncidentCount,
      centerOnUserLocation,
      reportIncident,
      toggleSatelliteView,
      closeIncidentModal,
      closePOIModal,
      openLightbox,
      closeLightbox,
      getDirections,
      shareIncident,
      callPOI,
      initLocationPickerMap,
      confirmLocationSelection,
      geocodeLocation,
      formatIncidentType,
      formatStatus,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.neighborhood-map {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.map-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.map-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.map-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 0;
}

.map-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.control-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-item {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  position: relative;
  padding-left: 30px;
}

.checkbox-label input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  position: absolute;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #f1f1f1;
  border-radius: 4px;
  border: 2px solid #ddd;
  transition: all 0.3s;
}

.checkbox-label input:checked ~ .checkmark {
  background-color: #42b983;
  border-color: #42b983;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label input:checked ~ .checkmark:after {
  display: block;
}

.incident-types {
  display: grid;
  gap: 8px;
}

.incident-type-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.incident-type-item:hover {
  background-color: #f8f9fa;
}

.incident-type-item.active {
    background-color: #e3f2fd;
  border-color: #2196f3;
}

.type-icon {
  font-size: 1.2rem;
}

.type-label {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.type-count {
  background-color: #e0e0e0;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-item {
  text-align: center;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.map-container {
  position: relative;
  height: 600px;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 100;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
   background-color: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.map-legend h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.incident-marker {
  background-color: #dc3545;
  color: white;
}

.poi-marker {
  background-color: #28a745;
  color: white;
}

.user-marker {
  background-color: #007bff;
  color: white;
}

.quick-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background-color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.action-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.location-btn {
  color: #007bff;
}

.report-btn {
  color: #dc3545;
}

.satellite-btn {
  color: #6f42c1;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.incident-modal,
.poi-modal,
.location-picker-modal {
  background-color: white;
  border-radius: 15px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: modalFadeIn 0.3s;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #777;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.incident-info,
.poi-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}

.info-label {
  font-weight: bold;
  width: 100px;
  color: #555;
}

.info-value {
  flex: 1;
}

.status-badge,
.urgency-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  text-transform: capitalize;
}

.status-badge {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-open {
  background-color: #ffebee;
  color: #d32f2f;
}

.status-pending {
  background-color: #fff8e1;
  color: #ff8f00;
}

.status-investigating {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-resolved {
  background-color: #e8f5e9;
  color: #388e3c;
}

.urgency-badge {
  background-color: #f5f5f5;
  color: #555;
}

.urgency-high {
  background-color: #ffebee;
  color: #d32f2f;
}

.urgency-medium {
  background-color: #fff8e1;
  color: #ff8f00;
}

.urgency-low {
  background-color: #e8f5e9;
  color: #388e3c;
}

.incident-description,
.poi-description {
  margin-top: 20px;
}

.incident-description h4,
.poi-description h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.incident-description p,
.poi-description p {
  margin: 0;
  color: #555;
  line-height: 1.5;
}

.incident-evidence {
  margin-top: 20px;
}

.incident-evidence h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.evidence-thumbnails {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.evidence-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s;
}

.evidence-thumb:hover {
  transform: scale(1.05);
}

.modal-actions {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
}

.action-button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s;
}

.directions-btn {
  background-color: #e3f2fd;
  color: #1976d2;
}

.directions-btn:hover {
  background-color: #bbdefb;
}

.share-btn {
  background-color: #f5f5f5;
  color: #555;
}

.share-btn:hover {
  background-color: #e0e0e0;
}

.call-btn {
  background-color: #e8f5e9;
  color: #388e3c;
}

.call-btn:hover {
  background-color: #c8e6c9;
}

.confirm-btn {
  background-color: #42b983;
  color: white;
}

.confirm-btn:hover {
  background-color: #369f6e;
}

/* Lightbox Styles */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.lightbox-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  display: block;
  border-radius: 8px;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
}

.coordinates-display {
  margin-top: 15px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px;
  font-family: monospace;
}

.coordinates-display p {
  margin: 5px 0;
  font-size: 14px;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .map-controls {
    grid-template-columns: 1fr;
  }
  
  .map-container {
    height: 500px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .action-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .neighborhood-map {
    padding: 10px;
  }
  
  .map-header h1 {
    font-size: 2rem;
  }
  
  .map-container {
    height: 400px;
  }
  
  .map-legend {
    bottom: 10px;
    left: 10px;
    padding: 10px;
  }
  
  .quick-actions {
    top: 10px;
    right: 10px;
  }
  
  .action-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
}
</style>