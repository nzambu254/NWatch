<template>
  <div class="manage-incidents">
    <div class="admin-header">
      <h1>Manage Incidents</h1>
      <div class="admin-stats">
        <div class="stat-card">
          <div class="stat-value">{{ totalIncidents }}</div>
          <div class="stat-label">Total Incidents</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ pendingIncidents }}</div>
          <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ investigatingIncidents }}</div>
          <div class="stat-label">Under Investigation</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ resolvedIncidents }}</div>
          <div class="stat-label">Resolved</div>
        </div>
      </div>
    </div>

    <div class="filters-section">
      <div class="search-filter">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search incidents by title, description, location, or reporter..."
          class="search-input"
        >
      </div>

      <div class="filter-controls">
        <select v-model="statusFilter" class="filter-select">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select v-model="typeFilter" class="filter-select">
          <option value="">All Types</option>
          <option value="theft">Theft</option>
          <option value="vandalism">Vandalism</option>
          <option value="suspicious_activity">Suspicious Activity</option>
          <option value="noise_complaint">Noise Complaint</option>
          <option value="parking_violation">Parking Violation</option>
          <option value="other">Other</option>
        </select>

        <select v-model="urgencyFilter" class="filter-select">
          <option value="">All Urgency</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select v-model="dateFilter" class="filter-select">
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select v-model="assignedFilter" class="filter-select">
          <option value="">All Assignments</option>
          <option value="unassigned">Unassigned</option>
          <option value="assigned">Assigned to Police</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading incidents...</p>
    </div>

    <div v-else-if="filteredIncidents.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No incidents found</h3>
      <p v-if="hasActiveFilters">Try adjusting your filters to see more incidents.</p>
      <p v-else>No incidents have been reported yet.</p>
    </div>

    <div v-else class="incidents-list">
      <div
        v-for="incident in filteredIncidents"
        :key="incident.id"
        class="incident-card"
        :class="[
          'urgency-' + incident.urgency,
          'status-' + incident.status
        ]"
      >
        <div class="incident-header">
          <div class="incident-meta">
            <span class="incident-type">{{ formatIncidentType(incident.type) }}</span>
            <span class="incident-date">{{ formatDate(incident.datetime) }}</span>
            <span class="incident-id">#{{ incident.id.substring(0, 8) }}</span>
          </div>
          <div class="incident-badges">
            <span :class="'urgency-badge urgency-' + incident.urgency">
              {{ incident.urgency.toUpperCase() }}
            </span>
            <span :class="'status-badge status-' + incident.status">
              {{ formatStatus(incident.status) }}
            </span>
          </div>
        </div>

        <div class="incident-content">
          <h3 class="incident-title">{{ incident.title }}</h3>
          <p class="incident-description">{{ incident.description }}</p>

          <div class="incident-details">
            <div class="detail-item">
              <span class="detail-label">📍 Location:</span>
              <span class="detail-value">{{ incident.location }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">🕒 Time:</span>
              <span class="detail-value">{{ formatDateTime(incident.datetime) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">👤 Reporter:</span>
              <span class="detail-value" v-if="!incident.anonymous">
                {{ getReporterInfo(incident.reporterInfo) }}
              </span>
              <span class="detail-value anonymous" v-else>Anonymous</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">📅 Reported:</span>
              <span class="detail-value">{{ formatDateTime(incident.createdAt) }}</span>
            </div>
            <div class="detail-item" v-if="incident.assignedToPolice">
              <span class="detail-label">👮 Assigned To:</span>
              <span class="detail-value assigned-police">{{ getAssignedPoliceInfo(incident) }}</span>
            </div>
          </div>

          <div v-if="!incident.anonymous && incident.reporterInfo" class="reporter-details">
            <h4>Reporter Information:</h4>
            <div class="reporter-info">
              <div class="reporter-item" v-if="incident.reporterInfo.name">
                <span class="reporter-label">Name:</span>
                <span class="reporter-value">{{ incident.reporterInfo.name }}</span>
              </div>
              <div class="reporter-item" v-if="incident.reporterInfo.firstName || incident.reporterInfo.lastName">
                <span class="reporter-label">Full Name:</span>
                <span class="reporter-value">
                  {{ incident.reporterInfo.firstName || '' }} {{ incident.reporterInfo.lastName || '' }}
                </span>
              </div>
              <div class="reporter-item" v-if="incident.reporterInfo.email">
                <span class="reporter-label">Email:</span>
                <span class="reporter-value">{{ incident.reporterInfo.email }}</span>
              </div>
              <div class="reporter-item" v-if="incident.reporterInfo.phone">
                <span class="reporter-label">Phone:</span>
                <span class="reporter-value">{{ incident.reporterInfo.phone }}</span>
              </div>
              <div class="reporter-item" v-if="incident.reporterInfo.address">
                <span class="reporter-label">Address:</span>
                <span class="reporter-value">{{ incident.reporterInfo.address }}</span>
              </div>
              <div class="reporter-item" v-if="incident.reporterInfo.userId">
                <span class="reporter-label">User ID:</span>
                <span class="reporter-value">{{ incident.reporterInfo.userId }}</span>
              </div>
            </div>
          </div>

          <div v-if="incident.evidenceUrls && incident.evidenceUrls.length > 0" class="evidence-section">
            <h4>Evidence:</h4>
            <div class="evidence-grid">
              <div
                v-for="(url, index) in incident.evidenceUrls"
                :key="index"
                class="evidence-item"
              >
                <img
                  :src="url"
                  :alt="'Evidence ' + (index + 1)"
                  @click="openLightbox(url)"
                  class="evidence-thumbnail"
                >
              </div>
            </div>
          </div>

          <div class="admin-actions">
            <div class="status-controls">
              <label>Update Status:</label>
              <select
                :value="incident.status"
                @change="updateIncidentStatus(incident.id, $event.target.value)"
                class="status-update-select"
              >
                <option value="pending">Pending</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div class="assignment-controls">
              <label>Assign to Police:</label>
              <select
                :value="incident.assignedToPolice || ''"
                @change="assignToPolice(incident.id, $event.target.value)"
                class="police-assignment-select"
              >
                <option value="">Select Police Officer</option>
                <option
                  v-for="officer in policeOfficers"
                  :key="officer.id"
                  :value="officer.id"
                >
                  {{ getOfficerDisplayName(officer) }} ({{ officer.email }})
                </option>
              </select>
            </div>

            <div class="action-buttons">
              <button
                @click="showUpdateModal(incident)"
                class="update-btn"
              >
                Add Update
              </button>
              <button
                @click="assignIncident(incident.id)"
                class="assign-btn"
                v-if="incident.status === 'pending'"
              >
                Assign to Me
              </button>
              <button
                @click="deleteIncident(incident.id)"
                class="delete-btn"
              >
                Delete
              </button>
            </div>
          </div>

          <div v-if="incident.statusUpdates && incident.statusUpdates.length > 0" class="status-updates">
            <h4>Status Updates:</h4>
            <div class="updates-list">
              <div
                v-for="(update, index) in incident.statusUpdates"
                :key="index"
                class="update-item"
              >
                <div class="update-header">
                  <span class="update-date">{{ formatDateTime(update.timestamp) }}</span>
                  <span class="update-admin">by {{ update.adminName || 'Admin' }}</span>
                </div>
                <div class="update-text">{{ update.message }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <h3>Add Status Update</h3>
        <div class="modal-body">
          <div class="form-group">
            <label>Update Message:</label>
            <textarea
              v-model="updateMessage"
              placeholder="Enter status update message..."
              rows="4"
              class="update-textarea"
            ></textarea>
          </div>
          <div class="form-group">
            <label>Change Status (optional):</label>
            <select v-model="newStatus" class="status-select">
              <option value="">Keep current status</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="cancel-btn">Cancel</button>
          <button @click="addStatusUpdate" class="confirm-btn">Add Update</button>
        </div>
      </div>
    </div>

    <div v-if="lightboxImage" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <img :src="lightboxImage" alt="Evidence" class="lightbox-image">
        <button @click="closeLightbox" class="lightbox-close">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../../services/firebase'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore'

export default {
  name: 'ManageIncidents',
  setup() {
    const router = useRouter()

    // Reactive data
    const incidents = ref([])
    const policeOfficers = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const typeFilter = ref('')
    const urgencyFilter = ref('')
    const dateFilter = ref('')
    const assignedFilter = ref('')
    const lightboxImage = ref(null)
    const showModal = ref(false)
    const selectedIncident = ref(null)
    const updateMessage = ref('')
    const newStatus = ref('')

    let unsubscribe = null

    onMounted(() => {
      // Check if user is admin
      if (!auth.currentUser) {
        router.push('/login')
        return
      }

      loadAllIncidents()
      loadPoliceOfficers()
    })

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe()
      }
    })

    // Load all incidents from Firestore
    const loadAllIncidents = () => {
      const incidentsQuery = query(
        collection(db, 'incidents'),
        orderBy('createdAt', 'desc')
      )

      unsubscribe = onSnapshot(incidentsQuery, (snapshot) => {
        incidents.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        loading.value = false
      }, (error) => {
        console.error('Error loading incidents:', error)
        loading.value = false
      })
    }

    // Load police officers from users collection
    const loadPoliceOfficers = async () => {
      try {
        const policeQuery = query(
          collection(db, 'users'),
          where('role', '==', 'police')
        )
        
        const snapshot = await getDocs(policeQuery)
        policeOfficers.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        console.log('Loaded police officers:', policeOfficers.value)
      } catch (error) {
        console.error('Error loading police officers:', error)
      }
    }

    // Helper function to get officer display name
    const getOfficerDisplayName = (officer) => {
      if (officer.firstName && officer.lastName) {
        return `${officer.firstName} ${officer.lastName}`
      }
      if (officer.firstName) return officer.firstName
      if (officer.name) return officer.name
      if (officer.email) return officer.email.split('@')[0]
      return 'Unknown Officer'
    }

    // Computed properties for statistics
    const totalIncidents = computed(() => incidents.value.length)

    const pendingIncidents = computed(() =>
      incidents.value.filter(incident => incident.status === 'pending').length
    )

    const investigatingIncidents = computed(() =>
      incidents.value.filter(incident => incident.status === 'investigating').length
    )

    const resolvedIncidents = computed(() =>
      incidents.value.filter(incident => incident.status === 'resolved').length
    )

    // Computed properties for filtering
    const hasActiveFilters = computed(() => {
      return searchQuery.value || statusFilter.value || typeFilter.value || 
             urgencyFilter.value || dateFilter.value || assignedFilter.value
    })

    const filteredIncidents = computed(() => {
      let filtered = incidents.value

      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(incident =>
          incident.title.toLowerCase().includes(query) ||
          incident.description.toLowerCase().includes(query) ||
          incident.location.toLowerCase().includes(query) ||
          (incident.reporterInfo && incident.reporterInfo.name &&
           incident.reporterInfo.name.toLowerCase().includes(query)) ||
          (incident.reporterInfo && incident.reporterInfo.email &&
           incident.reporterInfo.email.toLowerCase().includes(query))
        )
      }

      // Status filter
      if (statusFilter.value) {
        filtered = filtered.filter(incident => incident.status === statusFilter.value)
      }

      // Type filter
      if (typeFilter.value) {
        filtered = filtered.filter(incident => incident.type === typeFilter.value)
      }

      // Urgency filter
      if (urgencyFilter.value) {
        filtered = filtered.filter(incident => incident.urgency === urgencyFilter.value)
      }

      // Assignment filter
      if (assignedFilter.value) {
        if (assignedFilter.value === 'unassigned') {
          filtered = filtered.filter(incident => !incident.assignedToPolice)
        } else if (assignedFilter.value === 'assigned') {
          filtered = filtered.filter(incident => incident.assignedToPolice)
        }
      }

      // Date filter
      if (dateFilter.value) {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        filtered = filtered.filter(incident => {
          const incidentDate = incident.createdAt && incident.createdAt.toDate ? 
            incident.createdAt.toDate() : 
            new Date(incident.createdAt)

          switch (dateFilter.value) {
            case 'today':
              return incidentDate >= today
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              return incidentDate >= weekAgo
            case 'month':
              const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
              return incidentDate >= monthAgo
            default:
              return true
          }
        })
      }

      return filtered
    })

    // Utility functions
    const formatIncidentType = (type) => {
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatStatus = (status) => {
      return status.replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatDate = (datetime) => {
      if (!datetime) return 'N/A'
      const date = datetime.toDate ? datetime.toDate() : new Date(datetime)
      return date.toLocaleDateString()
    }

    const formatDateTime = (datetime) => {
      if (!datetime) return 'N/A'
      const date = datetime.toDate ? datetime.toDate() : new Date(datetime)
      return date.toLocaleString()
    }

    const getReporterInfo = (reporterInfo) => {
      if (!reporterInfo) return 'Unknown'
      if (reporterInfo.firstName || reporterInfo.lastName) {
        return `${reporterInfo.firstName || ''} ${reporterInfo.lastName || ''}`.trim()
      }
      if (reporterInfo.name) return reporterInfo.name
      if (reporterInfo.email) return reporterInfo.email
      return 'Unknown'
    }

    const getAssignedPoliceInfo = (incident) => {
      if (!incident.assignedToPolice) return 'Not assigned'
      
      const officer = policeOfficers.value.find(officer => officer.id === incident.assignedToPolice)
      if (officer) {
        return `${getOfficerDisplayName(officer)} (${officer.email})`
      }
      
      return incident.assignedToPoliceName || 'Unknown Officer'
    }

    // Get current user's name
    const getCurrentUserName = async () => {
      const currentUser = auth.currentUser
      if (!currentUser) return 'Admin'
      
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.firstName || userData.lastName) {
            return `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
          }
          if (userData.name) return userData.name
        }
        return 'Admin'
      } catch (error) {
        console.error('Error getting user name:', error)
        return 'Admin'
      }
    }

    // Admin action functions
    const updateIncidentStatus = async (incidentId, newStatus) => {
      try {
        const incidentRef = doc(db, 'incidents', incidentId)
        const currentTime = new Date()
        const adminName = await getCurrentUserName()

        await updateDoc(incidentRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        })

        await updateDoc(incidentRef, {
          statusUpdates: arrayUnion({
            message: `Status changed to ${formatStatus(newStatus)}`,
            timestamp: currentTime,
            adminName: adminName
          })
        })
      } catch (error) {
        console.error('Error updating incident status:', error)
        alert('Failed to update incident status')
      }
    }

    const assignToPolice = async (incidentId, policeId) => {
      try {
        const incidentRef = doc(db, 'incidents', incidentId)
        const currentTime = new Date()
        const adminName = await getCurrentUserName()
        
        if (!policeId) {
          // Unassign from police
          await updateDoc(incidentRef, {
            assignedToPolice: null,
            assignedToPoliceName: null,
            assignedToPoliceEmail: null,
            assignedOfficerId: null,
            updatedAt: serverTimestamp()
          })

          await updateDoc(incidentRef, {
            statusUpdates: arrayUnion({
              message: 'Incident unassigned from police officer',
              timestamp: currentTime,
              adminName: adminName
            })
          })
        } else {
          // Assign to police
          const officer = policeOfficers.value.find(officer => officer.id === policeId)
          
          if (officer) {
            const officerName = getOfficerDisplayName(officer)
            const officerEmail = officer.email || 'No email'
            
            await updateDoc(incidentRef, {
              assignedToPolice: policeId,
              assignedToPoliceName: officerName,
              assignedToPoliceEmail: officerEmail,
              assignedOfficerId: policeId,
              status: 'investigating',
              updatedAt: serverTimestamp()
            })

            await updateDoc(incidentRef, {
              statusUpdates: arrayUnion({
                message: `Incident assigned to Police Officer: ${officerName} (${officerEmail})`,
                timestamp: currentTime,
                adminName: adminName
              })
            })
          } else {
            throw new Error('Police officer not found')
          }
        }
      } catch (error) {
        console.error('Error assigning incident to police:', error)
        alert('Failed to assign incident to police: ' + error.message)
      }
    }

    const assignIncident = async (incidentId) => {
      try {
        const incidentRef = doc(db, 'incidents', incidentId)
        const currentTime = new Date()
        const currentUser = auth.currentUser
        const adminName = await getCurrentUserName()

        await updateDoc(incidentRef, {
          status: 'investigating',
          assignedTo: currentUser.uid,
          assignedToName: adminName,
          updatedAt: serverTimestamp()
        })

        await updateDoc(incidentRef, {
          statusUpdates: arrayUnion({
            message: `Incident assigned to ${adminName} and moved to investigating`,
            timestamp: currentTime,
            adminName: adminName
          })
        })
      } catch (error) {
        console.error('Error assigning incident:', error)
        alert('Failed to assign incident')
      }
    }

    const deleteIncident = async (incidentId) => {
      if (!confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
        return
      }

      try {
        await deleteDoc(doc(db, 'incidents', incidentId))
      } catch (error) {
        console.error('Error deleting incident:', error)
        alert('Failed to delete incident')
      }
    }

    // Modal functions
    const showUpdateModal = (incident) => {
      selectedIncident.value = incident
      updateMessage.value = ''
      newStatus.value = ''
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      selectedIncident.value = null
      updateMessage.value = ''
      newStatus.value = ''
    }

    const addStatusUpdate = async () => {
      if (!updateMessage.value.trim()) {
        alert('Please enter an update message')
        return
      }

      try {
        const incidentRef = doc(db, 'incidents', selectedIncident.value.id)
        const currentTime = new Date()
        const updateData = {
          updatedAt: serverTimestamp()
        }

        if (newStatus.value) {
          updateData.status = newStatus.value
        }

        await updateDoc(incidentRef, updateData)

        const adminName = await getCurrentUserName()

        await updateDoc(incidentRef, {
          statusUpdates: arrayUnion({
            message: updateMessage.value,
            timestamp: currentTime,
            adminName: adminName
          })
        })

        closeModal()
      } catch (error) {
        console.error('Error adding status update:', error)
        alert('Failed to add status update')
      }
    }

    // Lightbox functions
    const openLightbox = (imageUrl) => {
      lightboxImage.value = imageUrl
    }

    const closeLightbox = () => {
      lightboxImage.value = null
    }

    return {
      incidents,
      policeOfficers,
      loading,
      searchQuery,
      statusFilter,
      typeFilter,
      urgencyFilter,
      dateFilter,
      assignedFilter,
      lightboxImage,
      showModal,
      selectedIncident,
      updateMessage,
      newStatus,
      totalIncidents,
      pendingIncidents,
      investigatingIncidents,
      resolvedIncidents,
      hasActiveFilters,
      filteredIncidents,
      formatIncidentType,
      formatStatus,
      formatDate,
      formatDateTime,
      getReporterInfo,
      getAssignedPoliceInfo,
      getOfficerDisplayName,
      updateIncidentStatus,
      assignToPolice,
      assignIncident,
      deleteIncident,
      showUpdateModal,
      closeModal,
      addStatusUpdate,
      openLightbox,
      closeLightbox
    }
  }
}
</script>

<style scoped>
.manage-incidents {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.admin-header {
  margin-bottom: 30px;
}

.admin-header h1 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
  border-left: 4px solid #42b983;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 14px;
  text-transform: uppercase;
  font-weight: 600;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.search-filter {
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.filter-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  min-width: 150px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.empty-state p {
  color: #7f8c8d;
  margin-bottom: 20px;
}

.incidents-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.incident-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border-left: 5px solid #ddd;
  transition: transform 0.2s, box-shadow 0.2s;
}

.incident-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.incident-card.urgency-low {
  border-left-color: #28a745;
}

.incident-card.urgency-medium {
  border-left-color: #ffc107;
}

.incident-card.urgency-high {
  border-left-color: #dc3545;
}

.incident-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
  flex-wrap: wrap;
  gap: 10px;
}

.incident-meta {
  display: flex;
  gap: 15px;
  align-items: center;
}

.incident-type {
  font-weight: 600;
  color: #2c3e50;
  font-size: 16px;
}

.incident-date {
  color: #7f8c8d;
  font-size: 14px;
}

.incident-id {
  background-color: #f8f9fa;
  color: #6c757d;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-family: monospace;
}

.incident-badges {
  display: flex;
  gap: 8px;
}

.urgency-badge, .status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.urgency-badge.urgency-low {
  background-color: #d4edda;
  color: #155724;
}

.urgency-badge.urgency-medium {
  background-color: #fff3cd;
  color: #856404;
}

.urgency-badge.urgency-high {
  background-color: #f8d7da;
  color: #721c24;
}

.status-badge.status-pending {
  background-color: #e2e3e5;
  color: #383d41;
}

.status-badge.status-investigating {
  background-color: #cce5ff;
  color: #004085;
}

.status-badge.status-resolved {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.status-closed {
  background-color: #d1ecf1;
  color: #0c5460;
}

.incident-content {
  padding: 20px;
}

.incident-title {
  color: #2c3e50;
  margin: 0 0 10px;
  font-size: 20px;
}

.incident-description {
  color: #34495e;
  margin-bottom: 20px;
  line-height: 1.5;
}

.incident-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  gap: 5px;
}

.detail-label {
  font-weight: 600;
  color: #2c3e50;
}

.detail-value {
  color: #7f8c8d;
}

.detail-value.anonymous {
  font-style: italic;
}

.detail-value.assigned-police {
  color: #3498db;
  font-weight: 500;
}

.reporter-details {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.reporter-details h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.reporter-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.reporter-item {
  display: flex;
  flex-direction: column;
}

.reporter-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.reporter-value {
  font-size: 14px;
  color: #2c3e50;
  word-break: break-all;
}

.evidence-section {
  margin-bottom: 20px;
}

.evidence-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.evidence-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.evidence-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.2s;
}

.evidence-thumbnail:hover {
  transform: scale(1.05);
}

.admin-actions {
  background-color: #f1f8fe;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.status-controls, .assignment-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 200px;
}

.status-controls label, .assignment-controls label {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.status-update-select, .police-assignment-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.update-btn, .assign-btn, .delete-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.update-btn {
  background-color: #3498db;
  color: white;
}

.update-btn:hover {
  background-color: #2980b9;
}

.assign-btn {
  background-color: #2ecc71;
  color: white;
}

.assign-btn:hover {
  background-color: #27ae60;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
}

.delete-btn:hover {
  background-color: #c0392b;
}

.status-updates {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #eee;
}

.status-updates h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.update-item {
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.update-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.update-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 13px;
  color: #7f8c8d;
}

.update-text {
  color: #34495e;
  line-height: 1.5;
}

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

.modal-content {
  background-color: white;
  border-radius: 10px;
  width: 100%;
  max-width: 500px;
  padding: 25px;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #2c3e50;
}

.modal-body {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
}

.update-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  resize: vertical;
}

.status-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn, .confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn {
  background-color: #f8f9fa;
  color: #6c757d;
}

.cancel-btn:hover {
  background-color: #e2e6ea;
}

.confirm-btn {
  background-color: #42b983;
  color: white;
}

.confirm-btn:hover {
  background-color: #369f76;
}

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
  z-index: 1000;
}

.lightbox-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
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
  padding: 5px;
}

@media (max-width: 768px) {
  .admin-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filter-controls {
    flex-direction: column;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .admin-actions {
    flex-direction: column;
  }
  
  .action-buttons {
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .admin-stats {
    grid-template-columns: 1fr;
  }
  
  .incident-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .incident-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .incident-badges {
    width: 100%;
    justify-content: flex-start;
    margin-top: 10px;
  }
}
</style>