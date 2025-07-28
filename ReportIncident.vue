<template>
  <div class="report-incident">
    <h1>Report an Incident</h1>
    
    <!-- Emergency Contact Section -->
    <div class="emergency-section">
      <div class="emergency-card">
        <div class="emergency-icon">🚨</div>
        <div class="emergency-content">
          <h3>Emergency?</h3>
          <p>If this is a life-threatening emergency, contact police immediately</p>
          <button @click="contactPolice" class="emergency-btn" :disabled="isContactingPolice">
            {{ isContactingPolice ? 'Contacting...' : '📞 Contact Police Now' }}
          </button>
        </div>
      </div>
    </div>

    <div class="divider">
      <span>OR</span>
    </div>

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
          <option value="emergency">Emergency</option>
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

    <!-- Success Notification Modal -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="success-modal">
        <div class="success-icon">✅</div>
        <h3>Report Submitted Successfully!</h3>
        <p>Your incident report has been submitted and relevant authorities have been notified.</p>
        <p><strong>Reference ID:</strong> {{ reportId }}</p>
        <button @click="closeSuccessModal" class="action-button">OK</button>
      </div>
    </div>

    <!-- Emergency Contact Modal -->
    <div v-if="showEmergencyModal" class="modal-overlay">
      <div class="emergency-modal">
        <div class="emergency-icon-large">🚨</div>
        <h3>Emergency Alert Sent!</h3>
        <p>Police have been notified of your emergency and will respond shortly.</p>
        <p><strong>Emergency ID:</strong> {{ emergencyId }}</p>
        <p class="emergency-instructions">Stay calm and stay safe. Help is on the way.</p>
        <button @click="closeEmergencyModal" class="action-button emergency-action">OK</button>
      </div>
    </div>

    <!-- Audio element for notification sound -->
    <audio ref="notificationSound" preload="auto">
      <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjyV2u7JdCUELYPR8dCEMwcabbzs5qBOCg5Up+3xvWUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAkTYbPr5KFOCg5Up+zxvmUdBDOO1+3PeCwELYfU8NyFMgcbYbLr56lUEgxFnN/yvWYdBjyU2e7KdSUELILQ8tOHNAk=" type="audio/wav">
      Your browser does not support the audio element.
    </audio>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { auth, db, storage } from '../../services/firebase'
import { collection, doc, setDoc, serverTimestamp, getDocs, query, where, getDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useRouter } from 'vue-router'
import { getFunctions, httpsCallable } from 'firebase/functions' // Add this import

export default {
  name: 'ReportIncident',
  setup() {
    const router = useRouter()
    const isSubmitting = ref(false)
    const isContactingPolice = ref(false)
    const uploadedFiles = ref([])
    const selectedCoordinates = ref(null)
    const showLocationPicker = ref(false)
    const showSuccessModal = ref(false)
    const showEmergencyModal = ref(false)
    const reportId = ref('')
    const emergencyId = ref('')
    const notificationSound = ref(null)
    
    // Initialize Firebase Functions
    const functions = getFunctions() // Add this line
    
    const urgencyLevels = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' }
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

    // Function to play notification sound
    const playNotificationSound = () => {
      try {
        if (notificationSound.value) {
          notificationSound.value.currentTime = 0;
          notificationSound.value.play().catch(error => {
            console.warn('Could not play notification sound:', error);
            // Fallback: Create a simple beep using Web Audio API
            createBeepSound();
          });
        } else {
          createBeepSound();
        }
      } catch (error) {
        console.warn('Notification sound failed:', error);
        createBeepSound();
      }
    };

    // Fallback function to create a beep sound using Web Audio API
    const createBeepSound = () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
      }
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

    // Get all police officers
    const getPoliceOfficers = async () => {
      try {
        const usersRef = collection(db, 'users')
        const policeQuery = query(usersRef, where('role', '==', 'police'))
        const querySnapshot = await getDocs(policeQuery)
        
        const policeOfficers = []
        querySnapshot.forEach((doc) => {
          policeOfficers.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        return policeOfficers
      } catch (error) {
        console.error('Error fetching police officers:', error)
        return []
      }
    }

    // Fixed emergency contact function using Firebase Cloud Functions
    const contactPolice = async () => {
      if (!auth.currentUser) {
        alert('Please log in to contact police')
        return
      }

      isContactingPolice.value = true

      try {
        // Get all police officers with valid phone numbers
        const policeOfficers = await getPoliceOfficers()
        const officersWithPhones = policeOfficers.filter(officer => 
          officer.phone && officer.phone.startsWith('+254') && officer.phone.length >= 12
        )
        
        if (officersWithPhones.length === 0) {
          alert('No police officers with valid Kenyan phone numbers found in the system')
          return
        }

        // Get current user details
        const currentUser = auth.currentUser
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
        const userData = userDoc.exists() ? userDoc.data() : {}
        
        const userName = userData.firstName && userData.lastName 
                      ? `${userData.firstName} ${userData.lastName}` 
                      : 'Anonymous User'
        
        const userPhone = userData.phone || 'Not provided'
        const userLocation = incident.value.location || userData.location || 'Location not specified'

        // Create emergency record in Firestore first
        const emergencyRef = doc(collection(db, 'emergencies'))
        emergencyId.value = emergencyRef.id
        
        const emergencyData = {
          reportedBy: currentUser.uid,
          reporterName: userName,
          reporterPhone: userPhone,
          reporterLocation: userLocation,
          type: 'emergency_contact',
          status: 'active',
          createdAt: serverTimestamp(),
          location: selectedCoordinates.value ? {
            lat: selectedCoordinates.value.lat,
            lng: selectedCoordinates.value.lng,
            address: userLocation
          } : { address: userLocation },
          urgency: 'critical',
          notifiedOfficers: officersWithPhones.map(officer => ({
            id: officer.id,
            name: `${officer.firstName} ${officer.lastName}`,
            phone: officer.phone
          })),
          smsStatus: 'pending'
        }

        await setDoc(emergencyRef, emergencyData)

        // Try to call Firebase Cloud Function for SMS
        try {
          // You'll need to create this Firebase Cloud Function
          const sendEmergencySMS = httpsCallable(functions, 'sendEmergencySMS')
          
          const smsData = {
            emergencyId: emergencyId.value,
            reporterName: userName,
            reporterPhone: userPhone,
            location: userLocation,
            officers: officersWithPhones
          }

          const result = await sendEmergencySMS(smsData)
          console.log('SMS sent via Cloud Function:', result.data)
          
          // Update the emergency record with SMS success
          await setDoc(emergencyRef, {
            ...emergencyData,
            smsStatus: 'sent',
            smsResponse: result.data
          })
          
        } catch (functionError) {
          console.warn('Cloud Function SMS failed, falling back to in-app notification:', functionError)
          
          // Fallback: Create in-app notifications for police officers
          const notificationPromises = officersWithPhones.map(async (officer) => {
            const notificationRef = doc(collection(db, 'notifications'))
            return setDoc(notificationRef, {
              userId: officer.id,
              type: 'emergency_alert',
              title: '🚨 EMERGENCY ALERT',
              message: `Emergency reported by ${userName} at ${userLocation}. Contact: ${userPhone}`,
              data: {
                emergencyId: emergencyId.value,
                reporterName: userName,
                reporterPhone: userPhone,
                location: userLocation
              },
              read: false,
              createdAt: serverTimestamp()
            })
          })

          await Promise.all(notificationPromises)
          
          // Update emergency record
          await setDoc(emergencyRef, {
            ...emergencyData,
            smsStatus: 'fallback_notification',
            notificationsSent: officersWithPhones.length
          })
        }

        showEmergencyModal.value = true
        
      } catch (error) {
        console.error('Error contacting police:', error)
        alert('Failed to contact police. Please try again or call emergency services directly.')
      } finally {
        isContactingPolice.value = false
      }
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

        // Create incident document
        const incidentRef = doc(collection(db, 'incidents'))
        reportId.value = incidentRef.id
        
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
          status: 'open',
          reportedBy: incident.value.anonymous ? null : auth.currentUser.uid,
          datetime: new Date(`${incident.value.date}T${incident.value.time}`).toISOString()
        }

        await setDoc(incidentRef, incidentData)

        // Create notifications for police officers about the new incident
        if (incident.value.urgency === 'high' || incident.value.urgency === 'critical') {
          try {
            const policeOfficers = await getPoliceOfficers()
            const notificationPromises = policeOfficers.map(async (officer) => {
              const notificationRef = doc(collection(db, 'notifications'))
              return setDoc(notificationRef, {
                userId: officer.id,
                type: 'new_incident',
                title: `${incident.value.urgency.toUpperCase()} Priority Incident`,
                message: `${incident.value.title} reported at ${incident.value.location}`,
                data: {
                  incidentId: reportId.value,
                  incidentType: incident.value.type,
                  urgency: incident.value.urgency,
                  location: incident.value.location
                },
                read: false,
                createdAt: serverTimestamp()
              })
            })
            await Promise.all(notificationPromises)
          } catch (notificationError) {
            console.warn('Failed to send notifications to police:', notificationError)
          }
        }

        // Play notification sound when incident is successfully submitted
        playNotificationSound()
        
        showSuccessModal.value = true
      } catch (error) {
        console.error('Error submitting incident:', error)
        alert('Failed to submit incident. Please try again.')
      } finally {
        isSubmitting.value = false
      }
    }

    const closeSuccessModal = () => {
      showSuccessModal.value = false
      router.push({
        path: '/neighborhood-map',
        query: { reported: 'true' }
      })
    }

    const closeEmergencyModal = () => {
      showEmergencyModal.value = false
    }

    return {
      incident,
      urgencyLevels,
      uploadedFiles,
      isSubmitting,
      isContactingPolice,
      selectedCoordinates,
      showLocationPicker,
      showSuccessModal,
      showEmergencyModal,
      reportId,
      emergencyId,
      notificationSound,
      handleFileUpload,
      removeFile,
      openLocationPicker,
      closeLocationPicker,
      submitIncident,
      contactPolice,
      closeSuccessModal,
      closeEmergencyModal,
      playNotificationSound
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

/* Emergency Section Styles */
.emergency-section {
  margin-bottom: 30px;
}

.emergency-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
  animation: pulse 2s infinite;
}

.emergency-icon {
  font-size: 3rem;
  margin-right: 20px;
}

.emergency-content h3 {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
}

.emergency-content p {
  margin: 0 0 15px 0;
  opacity: 0.9;
}

.emergency-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid white;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.emergency-btn:hover:not(:disabled) {
  background: white;
  color: #ff6b6b;
}

.emergency-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes pulse {
  0% { box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); }
  50% { box-shadow: 0 4px 25px rgba(255, 107, 107, 0.5); }
  100% { box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3); }
}

.divider {
  text-align: center;
  position: relative;
  margin: 30px 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
}

.divider span {
  background: #f8f9fa;
  padding: 0 20px;
  color: #666;
  position: relative;
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
  flex-wrap: wrap;
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

.urgency-critical {
  background-color: #ff6b6b;
  color: white;
  font-weight: bold;
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

/* Success Modal */
.success-modal {
  background: white;
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.success-modal h3 {
  color: #42b983;
  margin-bottom: 15px;
}

.success-modal p {
  color: #666;
  margin-bottom: 10px;
}

/* Emergency Modal */
.emergency-modal {
  background: white;
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.emergency-icon-large {
  font-size: 4rem;
  margin-bottom: 20px;
  animation: pulse 1s infinite;
}

.emergency-modal h3 {
  color: #ff6b6b;
  margin-bottom: 15px;
}

.emergency-modal p {
  color: #666;
  margin-bottom: 10px;
}

.emergency-instructions {
  background: #fff3cd;
  padding: 15px;
  border-radius: 8px;
  color: #856404;
  font-weight: 600;
  margin: 15px 0;
}

.emergency-action {
  background-color: #ff6b6b;
}

.emergency-action:hover {
  background-color: #ee5a52;
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

  .emergency-card {
    flex-direction: column;
    text-align: center;
  }

  .emergency-icon {
    margin-right: 0;
    margin-bottom: 15px;
  }
}
</style>