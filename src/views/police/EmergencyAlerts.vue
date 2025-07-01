<template>
  <div class="emergency-alerts-container">
    <div class="header">
      <h1>Emergency Alerts</h1>
      <button v-if="hasAdminAccess" @click="showNewAlertModal = true" class="new-alert-btn">
        <i class="fas fa-plus"></i> New Alert
      </button>
    </div>

    <div class="alerts-list">
      <div v-if="alerts.length === 0" class="no-alerts">
        <i class="fas fa-bell-slash"></i>
        <p>No alerts found</p>
      </div>

      <div v-for="alert in alerts" :key="alert.id" 
           class="alert-card" 
           :class="`urgency-${alert.urgency}`"
           @click="viewAlert(alert)">
        <div class="alert-header">
          <div class="alert-title">
            {{ alert.type === 'emergency_contact' ? 'Emergency Contact' : alert.title || 'Emergency Alert' }}
          </div>
          <div class="alert-urgency">{{ alert.urgency }}</div>
        </div>
        <div class="alert-body">
          <p class="alert-description">{{ alert.address || 'Location not specified' }}</p>
          <div class="alert-meta">
            <div class="meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ alert.location ? `${alert.location.latitude}, ${alert.location.longitude}` : 'Unknown location' }}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-clock"></i>
              <span>{{ formatDateTime(alert.createdAt) }}</span>
            </div>
            <div class="meta-item" v-if="alert.reportedBy">
              <i class="fas fa-user"></i>
              <span>Reported by: {{ alert.userDetails?.name || alert.reporterEmail || 'Anonymous' }}</span>
            </div>
          </div>
        </div>
        <div class="alert-footer">
          <div class="alert-status" :class="`status-${alert.status}`">{{ alert.status }}</div>
          <div class="alert-actions" v-if="hasAdminAccess">
            <button v-if="alert.status === 'active'" @click.stop="updateAlertStatus(alert.id, 'inactive')" class="action-btn deactivate">
              <i class="fas fa-ban"></i> Deactivate
            </button>
            <button @click.stop="confirmDeleteAlert(alert.id)" class="action-btn delete">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Detail Modal -->
    <div v-if="showAlertDetailModal" class="modal-overlay" @click="closeAlertDetail">
      <div class="modal-content alert-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedAlert?.type === 'emergency_contact' ? 'Emergency Contact Details' : selectedAlert?.title || 'Emergency Alert Details' }}</h3>
          <button @click="closeAlertDetail" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Status Management Buttons -->
        <div v-if="hasAdminAccess && selectedAlert" class="status-management">
          <div class="status-buttons">
            <button 
              v-for="status in availableStatuses" 
              :key="status.value"
              @click="updateAlertStatus(selectedAlert.id, status.value)" 
              class="status-btn"
              :class="[`status-btn-${status.value}`, { active: selectedAlert.status === status.value }]"
              :disabled="updatingStatus">
              <i :class="status.icon"></i>
              {{ status.label }}
            </button>
          </div>
          <div class="current-status">
            Current Status: <span class="status-indicator" :class="`status-${selectedAlert.status}`">{{ selectedAlert.status.toUpperCase() }}</span>
          </div>
        </div>

        <div class="modal-body" v-if="selectedAlert">
          <div class="alert-detail-header">
            <div class="urgency-badge" :class="`urgency-${selectedAlert.urgency}`">
              {{ selectedAlert.urgency.toUpperCase() }}
            </div>
            <div class="alert-status-badge" :class="`status-${selectedAlert.status}`">
              {{ selectedAlert.status.toUpperCase() }}
            </div>
          </div>
          
          <div class="alert-detail-content">
            <div class="detail-section">
              <h4><i class="fas fa-map-marker-alt"></i> Location Information</h4>
              <p><strong>Address:</strong> {{ selectedAlert.address || 'Location not specified' }}</p>
              <p v-if="selectedAlert.location">
                <strong>Coordinates:</strong> {{ selectedAlert.location.latitude }}, {{ selectedAlert.location.longitude }}
              </p>
            </div>

            <div class="detail-section">
              <h4><i class="fas fa-clock"></i> Time Information</h4>
              <p><strong>Reported:</strong> {{ formatDateTime(selectedAlert.createdAt) }}</p>
              <p v-if="selectedAlert.updatedAt"><strong>Last Updated:</strong> {{ formatDateTime(selectedAlert.updatedAt) }}</p>
            </div>

            <div class="detail-section" v-if="selectedAlert.reportedBy">
              <h4><i class="fas fa-user"></i> Reporter Information</h4>
              <p><strong>Reported by:</strong> {{ selectedAlert.userDetails?.name || selectedAlert.reporterEmail || 'Anonymous' }}</p>
              <p v-if="selectedAlert.reporterEmail"><strong>Email:</strong> {{ selectedAlert.reporterEmail }}</p>
            </div>

            <!-- User Details Section -->
            <div v-if="selectedAlert.userDetails" class="detail-section user-details-section">
              <h4><i class="fas fa-address-card"></i> Contact Details</h4>
              <div class="user-details-grid">
                <div class="detail-item">
                  <i class="fas fa-phone"></i>
                  <span><strong>Phone:</strong> {{ selectedAlert.userDetails?.phone || 'Not provided' }}</span>
                </div>
                <div class="detail-item">
                  <i class="fas fa-envelope"></i>
                  <span><strong>Email:</strong> {{ selectedAlert.userDetails?.email || 'Not provided' }}</span>
                </div>
                <div class="detail-item">
                  <i class="fas fa-map-marked-alt"></i>
                  <span><strong>Location:</strong> {{ selectedAlert.userDetails?.location || 'Not provided' }}</span>
                </div>
              </div>
            </div>

            <!-- Status History Section -->
            <div v-if="selectedAlert.statusHistory && selectedAlert.statusHistory.length > 0" class="detail-section status-history-section">
              <h4><i class="fas fa-history"></i> Status History</h4>
              <div class="status-history">
                <div v-for="(history, index) in selectedAlert.statusHistory" :key="index" class="status-history-item">
                  <div class="status-change">
                    <span class="status-label" :class="`status-${history.status}`">{{ history.status.toUpperCase() }}</span>
                    <span class="status-time">{{ formatDateTime(history.timestamp) }}</span>
                  </div>
                  <div v-if="history.updatedBy" class="status-updater">
                    Updated by: {{ history.updatedBy }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" v-if="hasAdminAccess && selectedAlert">
          <div class="modal-actions">
            <button @click="confirmDeleteAlert(selectedAlert.id)" class="action-btn delete">
              <i class="fas fa-trash"></i> Delete Alert
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Alert Modal -->
    <div v-if="showNewAlertModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Create New Emergency Alert</h3>
          <button @click="showNewAlertModal = false" class="close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createNewAlert">
            <div class="form-group">
              <label>Title*</label>
              <input v-model="newAlert.title" type="text" required placeholder="Brief alert title">
            </div>
            <div class="form-group">
              <label>Address*</label>
              <input v-model="newAlert.address" type="text" required placeholder="Alert location address">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Latitude*</label>
                <input v-model="newAlert.latitude" type="number" step="0.000001" required placeholder="Location latitude">
              </div>
              <div class="form-group">
                <label>Longitude*</label>
                <input v-model="newAlert.longitude" type="number" step="0.000001" required placeholder="Location longitude">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Urgency Level*</label>
                <select v-model="newAlert.urgency" required>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                </select>
              </div>
              <div class="form-group">
                <label>Type*</label>
                <select v-model="newAlert.type" required>
                  <option value="emergency_contact">Emergency Contact</option>
                  <option value="general_alert">General Alert</option>
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" @click="showNewAlertModal = false" class="cancel-btn">
                Cancel
              </button>
              <button type="submit" class="submit-btn" :disabled="isCreatingAlert">
                {{ isCreatingAlert ? 'Creating...' : 'Create Alert' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="confirm-modal">
        <div class="confirm-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this alert? This action cannot be undone.</p>
        <div class="confirm-actions">
          <button @click="showConfirmModal = false" class="cancel-btn">
            Cancel
          </button>
          <button @click="deleteAlert(alertToDelete)" class="delete-btn">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { auth, db } from '../../services/firebase'
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, arrayUnion } from 'firebase/firestore'
import { useRouter } from 'vue-router'

export default {
  name: 'EmergencyAlerts',
  setup() {
    const router = useRouter()
    const isAdmin = ref(false)
    const isPolice = ref(false)
    const alerts = ref([])
    const showNewAlertModal = ref(false)
    const showAlertDetailModal = ref(false)
    const showConfirmModal = ref(false)
    const isCreatingAlert = ref(false)
    const updatingStatus = ref(false)
    const alertToDelete = ref(null)
    const selectedAlert = ref(null)

    const newAlert = ref({
      title: '',
      address: 'Location not specified',
      latitude: null,
      longitude: null,
      urgency: 'critical',
      type: 'emergency_contact',
      status: 'active'
    })

    const hasAdminAccess = computed(() => isAdmin.value || isPolice.value)

    const availableStatuses = computed(() => [
      { value: 'active', label: 'Active', icon: 'fas fa-play-circle' },
      { value: 'inactive', label: 'Inactive', icon: 'fas fa-pause-circle' },
      { value: 'in_progress', label: 'In Progress', icon: 'fas fa-spinner' },
      { value: 'resolved', label: 'Resolved', icon: 'fas fa-check-circle' },
      { value: 'expired', label: 'Expired', icon: 'fas fa-times-circle' }
    ])

    const checkUserRole = async () => {
      const user = auth.currentUser
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          isAdmin.value = userData.role === 'admin' && userData.approved
          isPolice.value = userData.role === 'police' && userData.approved
        }
      }
    }

    const fetchAlerts = async () => {
      try {
        let alertsQuery = collection(db, 'emergencies')
        
        if (!hasAdminAccess.value) {
          alertsQuery = query(
            alertsQuery,
            where('status', '==', 'active')
          )
        }
        
        const querySnapshot = await getDocs(alertsQuery)
        alerts.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => {
          return b.createdAt?.toDate() - a.createdAt?.toDate()
        })
      } catch (error) {
        console.error('Error fetching alerts:', error)
      }
    }

    const viewAlert = (alert) => {
      selectedAlert.value = alert
      showAlertDetailModal.value = true
    }

    const closeAlertDetail = () => {
      showAlertDetailModal.value = false
      selectedAlert.value = null
    }

    const formatDateTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      const date = timestamp.toDate()
      return date.toLocaleString()
    }

    const updateAlertStatus = async (alertId, newStatus) => {
      if (!hasAdminAccess.value || updatingStatus.value) return
      
      updatingStatus.value = true
      try {
        const user = auth.currentUser
        const currentTimestamp = new Date() // Use current timestamp for the history object
        
        // First create the status history object with current timestamp
        const statusHistory = {
          status: newStatus,
          timestamp: currentTimestamp,
          updatedBy: user?.email || 'Unknown'
        }

        // Then update the document with the new status and add to history
        await updateDoc(doc(db, 'emergencies', alertId), {
          status: newStatus,
          updatedAt: serverTimestamp(),
          statusHistory: arrayUnion(statusHistory)
        })
        
        // Update local data
        const alertIndex = alerts.value.findIndex(alert => alert.id === alertId)
        if (alertIndex !== -1) {
          alerts.value[alertIndex].status = newStatus
          alerts.value[alertIndex].updatedAt = { toDate: () => new Date() }
        }
        
        if (selectedAlert.value?.id === alertId) {
          selectedAlert.value.status = newStatus
          selectedAlert.value.updatedAt = { toDate: () => new Date() }
          if (!selectedAlert.value.statusHistory) {
            selectedAlert.value.statusHistory = []
          }
          selectedAlert.value.statusHistory.push({
            status: newStatus,
            timestamp: { toDate: () => new Date() },
            updatedBy: user?.email || 'Unknown'
          })
        }
        
        await fetchAlerts()
      } catch (error) {
        console.error('Error updating alert status:', error)
      } finally {
        updatingStatus.value = false
      }
    }

    const createNewAlert = async () => {
      if (!hasAdminAccess.value) return
      
      isCreatingAlert.value = true
      try {
        const user = auth.currentUser
        const currentTimestamp = new Date() // Use current timestamp for initial history

        await addDoc(collection(db, 'emergencies'), {
          title: newAlert.value.title,
          address: newAlert.value.address,
          location: {
            latitude: parseFloat(newAlert.value.latitude),
            longitude: parseFloat(newAlert.value.longitude)
          },
          urgency: newAlert.value.urgency,
          type: newAlert.value.type,
          status: 'active',
          createdAt: serverTimestamp(),
          reportedBy: user?.uid,
          reporterEmail: user?.email,
          statusHistory: [{
            status: 'active',
            timestamp: currentTimestamp,
            updatedBy: user?.email || 'Unknown'
          }]
        })
        
        showNewAlertModal.value = false
        resetNewAlertForm()
        await fetchAlerts()
      } catch (error) {
        console.error('Error creating alert:', error)
      } finally {
        isCreatingAlert.value = false
      }
    }

    const confirmDeleteAlert = (alertId) => {
      alertToDelete.value = alertId
      showConfirmModal.value = true
    }

    const deleteAlert = async (alertId) => {
      if (!hasAdminAccess.value) return
      
      showConfirmModal.value = false
      try {
        await deleteDoc(doc(db, 'emergencies', alertId))
        await fetchAlerts()
        
        if (selectedAlert.value?.id === alertId) {
          closeAlertDetail()
        }
      } catch (error) {
        console.error('Error deleting alert:', error)
      }
    }

    const resetNewAlertForm = () => {
      newAlert.value = {
        title: '',
        address: 'Location not specified',
        latitude: null,
        longitude: null,
        urgency: 'critical',
        type: 'emergency_contact',
        status: 'active'
      }
    }

    onMounted(async () => {
      await checkUserRole()
      await fetchAlerts()
    })

    return {
      isAdmin,
      isPolice,
      hasAdminAccess,
      alerts,
      newAlert,
      showNewAlertModal,
      showAlertDetailModal,
      showConfirmModal,
      isCreatingAlert,
      updatingStatus,
      alertToDelete,
      selectedAlert,
      availableStatuses,
      viewAlert,
      closeAlertDetail,
      formatDateTime,
      createNewAlert,
      updateAlertStatus,
      confirmDeleteAlert,
      deleteAlert
    }
  }
}
</script>

<style scoped>
.emergency-alerts-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin: 0;
}

.new-alert-btn {
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}

.new-alert-btn:hover {
  background-color: #ee5a52;
}

.new-alert-btn i {
  margin-right: 8px;
}

.alerts-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.alert-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: white;
}

.alert-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  font-weight: 600;
}

.alert-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-urgency {
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.8rem;
  text-transform: capitalize;
  margin-left: 10px;
}

.alert-body {
  padding: 0 15px 15px;
  flex: 1;
}

.alert-description {
  margin: 0 0 15px 0;
  color: #555;
  line-height: 1.5;
}

.alert-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
  color: #666;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-item i {
  width: 16px;
  text-align: center;
}

.alert-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
}

.alert-status {
  text-transform: capitalize;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
}

.alert-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: opacity 0.3s;
}

.action-btn:hover {
  opacity: 0.8;
}

.action-btn i {
  margin-right: 5px;
}

.deactivate {
  background-color: #fff3cd;
  color: #856404;
}

.delete {
  background-color: #f8d7da;
  color: #721c24;
}

.no-alerts {
  grid-column: 1 / -1;
  text-align: center;
  padding: 50px 20px;
  color: #666;
}

.no-alerts i {
  font-size: 2rem;
  margin-bottom: 15px;
  color: #95a5a6;
}

.no-alerts p {
  margin: 0;
  font-size: 1.1rem;
}

/* Status Management Styles */
.status-management {
  padding: 20px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
}

.status-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.status-btn {
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-btn.active {
  border-color: #2c3e50;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-btn-active {
  background-color: #d4edda;
  color: #155724;
}

.status-btn-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.status-btn-in_progress {
  background-color: #fff3cd;
  color: #856404;
}

.status-btn-resolved {
  background-color: #d1ecf1;
  color: #0c5460;
}

.status-btn-expired {
  background-color: #e2e3e5;
  color: #383d41;
}

.current-status {
  font-size: 0.9rem;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

/* Status History Styles */
.status-history-section {
  border-left-color: #17a2b8;
}

.status-history-section h4 {
  color: #17a2b8;
}

.status-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-history-item {
  background-color: white;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #17a2b8;
}

.status-change {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.status-label {
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-time {
  font-size: 0.8rem;
  color: #666;
}

.status-updater {
  font-size: 0.8rem;
  color: #888;
  font-style: italic;
}

/* Status Colors */
.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.status-in_progress {
  background-color: #fff3cd;
  color: #856404;
}

.status-resolved {
  background-color: #d1ecf1;
  color: #0c5460;
}

.status-expired {
  background-color: #e2e3e5;
  color: #383d41;
}

/* Urgency Styles */
.urgency-critical {
  border-left: 5px solid #ff6b6b;
}

.urgency-critical .alert-header {
  background-color: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
}

.urgency-critical .alert-urgency {
  background-color: #ff6b6b;
  color: white;
}

.urgency-high {
  border-left: 5px solid #f8d7da;
}

.urgency-high .alert-header {
  background-color: rgba(248, 215, 218, 0.1);
  color: #721c24;
}

.urgency-high .alert-urgency {
  background-color: #f8d7da;
  color: #721c24;
}

.urgency-medium {
  border-left: 5px solid #fff3cd;
}

.urgency-medium .alert-header {
  background-color: rgba(255, 243, 205, 0.1);
  color: #856404;
}

.urgency-medium .alert-urgency {
  background-color: #fff3cd;
  color: #856404;
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

.modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.alert-detail-modal {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
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

.alert-detail-header {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.urgency-badge, .alert-status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
}

.urgency-badge.urgency-critical {
  background-color: #ff6b6b;
  color: white;
}

.urgency-badge.urgency-high {
  background-color: #f8d7da;
  color: #721c24;
}

.urgency-badge.urgency-medium {
  background-color: #fff3cd;
  color: #856404;
}

.alert-detail-content {
  display: flex;
    flex-direction: column;
  gap: 20px;
}

.detail-section {
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.detail-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-section h4 i {
  color: #6c757d;
}

.detail-section p {
  margin: 8px 0;
}

.detail-section p strong {
  color: #343a40;
  min-width: 120px;
  display: inline-block;
}

.user-details-section {
  border-left: 3px solid #6f42c1;
}

.user-details-section h4 {
  color: #6f42c1;
}

.user-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-item i {
  color: #6c757d;
  width: 20px;
  text-align: center;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}

.modal-actions {
  display: flex;
  gap: 10px;
}

/* New Alert Form Styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #495057;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.cancel-btn {
  padding: 10px 20px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.submit-btn {
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover {
  background-color: #218838;
}

.submit-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* Confirmation Modal Styles */
.confirm-modal {
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.confirm-icon {
  font-size: 3rem;
  color: #ffc107;
  margin-bottom: 20px;
}

.confirm-modal h3 {
  margin-top: 0;
  color: #343a40;
}

.confirm-modal p {
  color: #6c757d;
  margin-bottom: 25px;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.delete-btn {
  padding: 10px 20px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #c82333;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .alerts-list {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .alert-detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .status-buttons {
    flex-direction: column;
  }
  
  .user-details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .emergency-alerts-container {
    padding: 15px;
  }
  
  .modal-content {
    width: 95%;
  }
  
  .form-actions, .confirm-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .form-actions button, .confirm-actions button {
    width: 100%;
  }
}
</style>