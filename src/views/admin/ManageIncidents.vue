
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
          </div>

          <div v-if="!incident.anonymous && incident.reporterInfo" class="reporter-details">
            <h4>Reporter Information:</h4>
            <div class="reporter-info">
              <div class="reporter-item" v-if="incident.reporterInfo.name">
                <span class="reporter-label">Name:</span>
                <span class="reporter-value">{{ incident.reporterInfo.name }}</span>
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
  serverTimestamp
} from 'firebase/firestore'

export default {
  name: 'ManageIncidents',
  setup() {
    const router = useRouter()

    // Reactive data
    const incidents = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const typeFilter = ref('')
    const urgencyFilter = ref('')
    const dateFilter = ref('')
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
      return searchQuery.value || statusFilter.value || typeFilter.value || urgencyFilter.value || dateFilter.value
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

      // Date filter
      if (dateFilter.value) {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        filtered = filtered.filter(incident => {
          const incidentDate = incident.createdAt.toDate ? incident.createdAt.toDate() : new Date(incident.createdAt)

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
      if (reporterInfo.name) return reporterInfo.name
      if (reporterInfo.email) return reporterInfo.email
      return 'Unknown'
    }

    // Admin action functions - using JavaScript Date for timestamp in arrayUnion
    const updateIncidentStatus = async (incidentId, newStatus) => {
      try {
        const incidentRef = doc(db, 'incidents', incidentId)
        const currentTime = new Date() // Use JavaScript Date

        // First update the status
        await updateDoc(incidentRef, {
          status: newStatus,
          updatedAt: serverTimestamp()
        })

        // Then add status update to history using JavaScript Date
        await updateDoc(incidentRef, {
          statusUpdates: arrayUnion({
            message: `Status changed to ${formatStatus(newStatus)}`,
            timestamp: currentTime, // Use JavaScript Date here
            adminName: auth.currentUser.displayName || 'Admin'
          })
        })
      } catch (error) {
        console.error('Error updating incident status:', error)
        alert('Failed to update incident status')
      }
    }

    const assignIncident = async (incidentId) => {
      try {
        const incidentRef = doc(db, 'incidents', incidentId)
        const currentTime = new Date() // Use JavaScript Date

        // First update the assignment
        await updateDoc(incidentRef, {
          status: 'investigating',
          assignedTo: auth.currentUser.uid,
          assignedToName: auth.currentUser.displayName || 'Admin',
          updatedAt: serverTimestamp()
        })

        // Then add status update to history using JavaScript Date
        await updateDoc(incidentRef, {
          statusUpdates: arrayUnion({
            message: `Incident assigned to ${auth.currentUser.displayName || 'Admin'} and moved to investigating`,
            timestamp: currentTime, // Use JavaScript Date here
            adminName: auth.currentUser.displayName || 'Admin'
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
        const currentTime = new Date() // Use JavaScript Date
        const updateData = {
          updatedAt: serverTimestamp()
        }

        // Update status if selected
        if (newStatus.value) {
          updateData.status = newStatus.value
        }

        // First update the basic fields
        await updateDoc(incidentRef, updateData)

        // Then add status update to history using JavaScript Date
        await updateDoc(incidentRef, {
          statusUpdates: arrayUnion({
            message: updateMessage.value,
            timestamp: currentTime, // Use JavaScript Date here
            adminName: auth.currentUser.displayName || 'Admin'
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
      loading,
      searchQuery,
      statusFilter,
      typeFilter,
      urgencyFilter,
      dateFilter,
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
      updateIncidentStatus,
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

.status-pending {
  background-color: #e2e3e5;
  color: #495057;
}

.status-investigating {
  background-color: #cce5ff;
  color: #004085;
}

.status-resolved {
  background-color: #d4edda;
  color: #155724;
}

.status-closed {
  background-color: #f8d7da;
  color: #721c24;
}

.incident-content {
  padding: 20px;
}

.incident-title {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 18px;
}

.incident-description {
  color: #555;
  line-height: 1.6;
  margin-bottom: 20px;
}

.incident-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-weight: 600;
  min-width: 100px;
}

.detail-value {
  color: #555;
}

.detail-value.anonymous {
  font-style: italic;
  color: #7f8c8d;
}

/* Enhanced Reporter Details Styling */
.reporter-details {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.reporter-details h4 {
  color: #2c3e50;
  margin-bottom: 12px;
  font-size: 16px;
}

.reporter-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 8px;
}

.reporter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reporter-label {
  font-weight: 600;
  color: #495057;
  min-width: 60px;
}

.reporter-value {
  color: #212529;
  word-break: break-word;
}

.evidence-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.evidence-section h4 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.evidence-thumbnail {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 5px;
  cursor: pointer;
    transition: transform 0.2s;
}

.evidence-thumbnail:hover {
  transform: scale(1.05);
}

.admin-actions {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  margin-top: 20px;
  border-top: 1px solid #eee;
}

.status-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.status-controls label {
  font-weight: 600;
  color: #2c3e50;
}

.status-update-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.update-btn, .assign-btn, .delete-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.update-btn {
  background-color: #007bff;
  color: white;
}

.update-btn:hover {
  background-color: #0056b3;
}

.assign-btn {
  background-color: #28a745;
  color: white;
}

.assign-btn:hover {
  background-color: #1e7e34;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
}

.delete-btn:hover {
  background-color: #c82333;
}

.status-updates {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.status-updates h4 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.update-item {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 5px;
  border-left: 3px solid #42b983;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.update-date {
  font-size: 12px;
  color: #7f8c8d;
}

.update-admin {
  font-size: 12px;
  color: #007bff;
  font-weight: 600;
}

.update-text {
  color: #555;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

.modal-body {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.update-textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 100px;
}

.status-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
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
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-btn {
  background-color: #f8f9fa;
  color: #6c757d;
}

.cancel-btn:hover {
  background-color: #e2e6ea;
}

.confirm-btn {
  background-color: #28a745;
  color: white;
}

.confirm-btn:hover {
  background-color: #218838;
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
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
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

/* Responsive adjustments */
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

  .incident-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .incident-meta {
    flex-wrap: wrap;
  }

  .action-buttons {
    flex-direction: column;
  }

  .update-btn, .assign-btn, .delete-btn {
    width: 100%;
  }

  .reporter-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .admin-stats {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }

  .cancel-btn, .confirm-btn {
    width: 100%;
  }

  .incident-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .incident-badges {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
```