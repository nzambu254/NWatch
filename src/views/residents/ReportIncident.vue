<template>
  <div class="report-incident">
    <h1>Report an Incident</h1>
    
    <form @submit.prevent="submitIncident" class="incident-form">
      <div class="form-group">
        <label for="incidentType">Incident Type</label>
        <select id="incidentType" v-model="incident.type" required>
          <option value="" disabled>Select incident type</option>
          <option value="theft">Theft</option>
          <option value="vandalism">Vandalism</option>
          <option value="suspicious_activity">Suspicious Activity</option>
          <option value="noise_complaint">Noise Complaint</option>
          <option value="parking_violation">Parking Violation</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div class="form-group">
        <label for="title">Title</label>
        <input type="text" id="title" v-model="incident.title" required placeholder="Brief description">
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" v-model="incident.description" required 
                  placeholder="Provide detailed information about the incident"></textarea>
      </div>

      <div class="form-group">
        <label for="location">Location</label>
        <input type="text" id="location" v-model="incident.location" required 
               placeholder="Address or landmark">
        <button type="button" @click="openLocationPicker" class="location-picker-btn">
          📍 Pick on Map
        </button>
        <div v-if="selectedCoordinates" class="selected-location">
          <small>Selected coordinates: {{ selectedCoordinates.lat.toFixed(6) }}, {{ selectedCoordinates.lng.toFixed(6) }}</small>
        </div>
      </div>

      <!-- Location Picker Modal -->
      <div v-if="showLocationPicker" class="modal-overlay" @click="closeLocationPicker">
        <div class="location-picker-modal" @click.stop>
          <div class="modal-header">
            <h3>Select Location on Map</h3>
            <button @click="closeLocationPicker" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <div id="location-picker-map" class="location-picker-map"></div>
            <p class="picker-instructions">Click on the map to select the incident location</p>
          </div>
          <div class="modal-actions">
            <button @click="closeLocationPicker" class="action-button">Done</button>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="date">Date</label>
          <input type="date" id="date" v-model="incident.date" required>
        </div>
        <div class="form-group">
          <label for="time">Time</label>
          <input type="time" id="time" v-model="incident.time" required>
        </div>
      </div>

      <div class="form-group">
        <label>Urgency Level</label>
        <div class="urgency-levels">
          <label v-for="level in urgencyLevels" :key="level.value">
            <input type="radio" v-model="incident.urgency" :value="level.value" required>
            <span :class="'urgency-' + level.value">{{ level.label }}</span>
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="evidence">Upload Evidence (Optional)</label>
        <input type="file" id="evidence" @change="handleFileUpload" multiple accept="image/*,video/*">
        <div v-if="uploadedFiles.length > 0" class="uploaded-files">
          <div v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
            {{ file.name }}
            <button type="button" @click="removeFile(index)" class="remove-file">×</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="incident.anonymous" id="anonymous">
          Report anonymously
        </label>
      </div>

      <button type="submit" class="submit-btn" :disabled="isSubmitting">
        {{ isSubmitting ? 'Submitting...' : 'Submit Report' }}
      </button>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { auth, db, storage } from '../../services/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useRouter } from 'vue-router'

export default {
  name: 'ReportIncident',
  setup() {
    const router = useRouter()
    const isSubmitting = ref(false)
    const uploadedFiles = ref([])
    const selectedCoordinates = ref(null)
    const showLocationPicker = ref(false)
    
    const urgencyLevels = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ]

    const incident = ref({
      type: '',
      title: '',
      description: '',
      location: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().substring(0, 5),
      urgency: 'medium',
      anonymous: false,
      evidenceUrls: []
    })

    // Load Google Maps API
    const loadGoogleMaps = () => {
      return new Promise((resolve) => {
        if (window.google && window.google.maps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBux3LWgjt4Y2pz0vOoF0TBz4K49BWfzlY&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        document.head.appendChild(script);
      });
    };

    onMounted(async () => {
      await loadGoogleMaps()
    })

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files)
      uploadedFiles.value = [...uploadedFiles.value, ...files]
    }

    const removeFile = (index) => {
      uploadedFiles.value.splice(index, 1)
    }

    const generateUniqueId = () => {
      const timestamp = Date.now().toString(36)
      const random = Math.random().toString(36).substring(2, 8)
      return `${timestamp}-${random}`
    }

    const uploadFiles = async () => {
      const urls = []
      for (const file of uploadedFiles.value) {
        const uniqueId = generateUniqueId()
        const fileRef = storageRef(storage, `incidents/evidence/${uniqueId}-${file.name}`)
        await uploadBytes(fileRef, file)
        const downloadURL = await getDownloadURL(fileRef)
        urls.push(downloadURL)
      }
      return urls
    }

    // Geocode location to get coordinates
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

    const openLocationPicker = () => {
      showLocationPicker.value = true
      setTimeout(() => {
        initLocationPickerMap()
      }, 100)
    }

    const closeLocationPicker = () => {
      showLocationPicker.value = false
    }

    const initLocationPickerMap = () => {
      const mapElement = document.getElementById('location-picker-map')
      if (!mapElement) return

      const map = new google.maps.Map(mapElement, {
        zoom: 15,
        center: { lat: -1.2921, lng: 36.8219 }
      })
      
      let marker = null
      
      map.addListener('click', (event) => {
        if (marker) {
          marker.setMap(null)
        }
        
        marker = new google.maps.Marker({
          position: event.latLng,
          map: map,
          title: 'Selected Location'
        })
        
        selectedCoordinates.value = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        }
        
        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: event.latLng }, (results, status) => {
          if (status === 'OK' && results[0]) {
            incident.value.location = results[0].formatted_address
          }
        })
      })
    }

    const submitIncident = async () => {
      if (!auth.currentUser && !incident.value.anonymous) {
        alert('Please log in to report an incident or select anonymous reporting')
        return
      }

      isSubmitting.value = true

      try {
        // Try to geocode the location if coordinates weren't picked manually
        let coordinates = selectedCoordinates.value
        if (!coordinates && incident.value.location) {
          try {
            coordinates = await geocodeLocation(incident.value.location)
          } catch (error) {
            console.warn('Geocoding failed, proceeding without coordinates:', error)
          }
        }

        // Upload files if any
        if (uploadedFiles.value.length > 0) {
          incident.value.evidenceUrls = await uploadFiles()
        }

        // Create incident document with consistent structure
        const incidentData = {
          type: incident.value.type,
          title: incident.value.title,
          description: incident.value.description,
          location: incident.value.location,
          // Add coordinates if available
          ...(coordinates && {
            lat: coordinates.lat,
            lng: coordinates.lng,
            formattedAddress: coordinates.formattedAddress || incident.value.location
          }),
          urgency: incident.value.urgency,
          anonymous: incident.value.anonymous,
          evidenceUrls: incident.value.evidenceUrls || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'open', // Match map expectations
          reportedBy: incident.value.anonymous ? null : auth.currentUser.uid,
          datetime: new Date(`${incident.value.date}T${incident.value.time}`).toISOString()
        }

        const incidentsCollection = collection(db, 'incidents')
        const newIncidentRef = doc(incidentsCollection)
        await setDoc(newIncidentRef, incidentData)

        // Redirect to map to see the reported incident
        router.push({
          path: '/neighborhood-map',
          query: { reported: 'true' }
        })
      } catch (error) {
        console.error('Error submitting incident:', error)
        alert('Failed to submit incident. Please try again.')
      } finally {
        isSubmitting.value = false
      }
    }

    return {
      incident,
      urgencyLevels,
      uploadedFiles,
      isSubmitting,
      selectedCoordinates,
      showLocationPicker,
      handleFileUpload,
      removeFile,
      openLocationPicker,
      closeLocationPicker,
      submitIncident
    }
  }
}
</script>

<style scoped>
.report-incident {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 30px;
  text-align: center;
}

.incident-form {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input[type="text"],
.form-group input[type="date"],
.form-group input[type="time"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.form-group textarea {
  min-height: 120px;
  resize: vertical;
}

.location-picker-btn {
  margin-top: 8px;
  padding: 8px 16px;
  background-color: #e3f2fd;
  color: #2196f3;
  border: 1px solid #2196f3;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.location-picker-btn:hover {
  background-color: #bbdefb;
}

.selected-location {
  margin-top: 8px;
  padding: 8px;
  background-color: #e8f5e9;
  border-radius: 4px;
}

.selected-location small {
  color: #2e7d32;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.urgency-levels {
  display: flex;
  gap: 15px;
  margin-top: 8px;
}

.urgency-levels label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.urgency-levels span {
  padding: 5px 10px;
  border-radius: 5px;
}

.urgency-low {
  background-color: #d4edda;
  color: #155724;
}

.urgency-medium {
  background-color: #fff3cd;
  color: #856404;
}

.urgency-high {
  background-color: #f8d7da;
  color: #721c24;
}

input[type="file"] {
  width: 100%;
  padding: 10px;
  border: 1px dashed #ddd;
  border-radius: 5px;
}

.uploaded-files {
  margin-top: 10px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 5px;
  margin-bottom: 5px;
}

.remove-file {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover {
  background-color: #369f6e;
}

.submit-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
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

.location-picker-modal {
  background-color: white;
  border-radius: 15px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
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
  color: #999;
  padding: 5px;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.location-picker-map {
  height: 400px;
  width: 100%;
  border-radius: 8px;
}

.picker-instructions {
  text-align: center;
  color: #666;
  margin-top: 10px;
  font-size: 14px;
}

.modal-actions {
  padding: 20px;
  border-top: 1px solid #eee;
  text-align: right;
}

.action-button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.action-button:hover {
  background-color: #369f6e;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .urgency-levels {
    flex-direction: column;
    gap: 5px;
  }
  
  .location-picker-modal {
    width: 95%;
  }
  
  .location-picker-map {
    height: 300px;
  }
}
</style>