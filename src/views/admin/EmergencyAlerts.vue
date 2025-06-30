<template>
  <div class="emergency-alerts-container">
    <div class="header">
      <h1>Emergency Alerts</h1>
      <button v-if="isAdmin" @click="showNewAlertModal = true" class="new-alert-btn">
        <i class="fas fa-plus"></i> New Alert
      </button>
    </div>

    <div class="alert-filters">
      <div class="filter-group">
        <label>Status:</label>
        <select v-model="filterStatus">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Urgency:</label>
        <select v-model="filterUrgency">
          <option value="all">All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </div>
      <div class="filter-group">
        <label>View Status:</label>
        <select v-model="filterViewStatus">
          <option value="all">All</option>
          <option value="unviewed">Unviewed</option>
          <option value="viewed">Viewed</option>
        </select>
      </div>
    </div>

    <div class="alerts-list">
      <div v-if="filteredAlerts.length === 0" class="no-alerts">
        <i class="fas fa-bell-slash"></i>
        <p>No alerts found matching your criteria</p>
      </div>

      <div v-for="alert in filteredAlerts" :key="alert.id" 
           class="alert-card" 
           :class="[`urgency-${alert.urgency}`, { 'unviewed': !isAlertViewed(alert.id) }]"
           @click="viewAlert(alert)">
        <div class="alert-header">
          <div class="alert-title">
            <span v-if="!isAlertViewed(alert.id)" class="unviewed-indicator"></span>
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
            <div class="meta-item">
              <i class="fas fa-eye"></i>
              <span>{{ isAlertViewed(alert.id) ? 'Viewed' : 'Not viewed' }}</span>
            </div>
          </div>
        </div>
        <div class="alert-footer">
          <div class="alert-status">{{ alert.status }}</div>
          <div class="alert-actions" v-if="isAdmin">
            <button v-if="alert.status === 'active'" @click.stop="deactivateAlert(alert.id)" class="action-btn deactivate">
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
          </div>
        </div>
        <div class="modal-footer" v-if="isAdmin && selectedAlert">
          <div class="modal-actions">
            <button v-if="selectedAlert.status === 'active'" @click="deactivateAlert(selectedAlert.id)" class="action-btn deactivate">
              <i class="fas fa-ban"></i> Deactivate Alert
            </button>
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
import { ref, computed, onMounted } from 'vue'
import { auth, db } from '../../services/firebase'
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, arrayUnion } from 'firebase/firestore'
import { useRouter } from 'vue-router'

export default {
  name: 'EmergencyAlerts',
  setup() {
    const router = useRouter()
    const isAdmin = ref(false)
    const alerts = ref([])
    const viewedAlerts = ref([])
    const showNewAlertModal = ref(false)
    const showAlertDetailModal = ref(false)
    const showConfirmModal = ref(false)
    const isCreatingAlert = ref(false)
    const alertToDelete = ref(null)
    const selectedAlert = ref(null)
    const filterStatus = ref('active')
    const filterUrgency = ref('all')
    const filterViewStatus = ref('all')

    const newAlert = ref({
      title: '',
      address: 'Location not specified',
      latitude: null,
      longitude: null,
      urgency: 'critical',
      type: 'emergency_contact',
      status: 'active'
    })

    const checkAdminStatus = async () => {
      const user = auth.currentUser
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          isAdmin.value = userData.role === 'admin' && userData.approved
        }
      }
    }

    const fetchAlerts = async () => {
      try {
        let alertsQuery = collection(db, 'emergencies')
        
        // If not admin, only show active alerts
        if (!isAdmin.value) {
          alertsQuery = query(
            alertsQuery,
            where('status', '==', 'active')
          )
        }
        
        const querySnapshot = await getDocs(alertsQuery)
        alerts.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error fetching alerts:', error)
      }
    }

    const fetchViewedAlerts = async () => {
      try {
        const user = auth.currentUser
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            viewedAlerts.value = userData.viewedAlerts || []
          }
        }
      } catch (error) {
        console.error('Error fetching viewed alerts:', error)
      }
    }

    const isAlertViewed = (alertId) => {
      return viewedAlerts.value.includes(alertId)
    }

    const markAlertAsViewed = async (alertId) => {
      try {
        const user = auth.currentUser
        if (user && !isAlertViewed(alertId)) {
          // Update user's viewedAlerts array
          await updateDoc(doc(db, 'users', user.uid), {
            viewedAlerts: arrayUnion(alertId)
          })
          
          // Update local state
          viewedAlerts.value.push(alertId)
        }
      } catch (error) {
        console.error('Error marking alert as viewed:', error)
      }
    }

    const viewAlert = async (alert) => {
      selectedAlert.value = alert
      showAlertDetailModal.value = true
      
      // Mark as viewed
      await markAlertAsViewed(alert.id)
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

    const createNewAlert = async () => {
      if (!isAdmin.value) return
      
      isCreatingAlert.value = true
      try {
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
          reportedBy: auth.currentUser.uid,
          reporterEmail: auth.currentUser.email
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

    const deactivateAlert = async (alertId) => {
      try {
        await updateDoc(doc(db, 'emergencies', alertId), {
          status: 'expired',
          updatedAt: serverTimestamp()
        })
        await fetchAlerts()
        
        // Close detail modal if this alert is being viewed
        if (selectedAlert.value?.id === alertId) {
          closeAlertDetail()
        }
      } catch (error) {
        console.error('Error deactivating alert:', error)
      }
    }

    const confirmDeleteAlert = (alertId) => {
      alertToDelete.value = alertId
      showConfirmModal.value = true
    }

    const deleteAlert = async (alertId) => {
      showConfirmModal.value = false
      try {
        await deleteDoc(doc(db, 'emergencies', alertId))
        await fetchAlerts()
        
        // Close detail modal if this alert is being viewed
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

    const filteredAlerts = computed(() => {
      return alerts.value.filter(alert => {
        // Filter by status
        const statusMatch = filterStatus.value === 'all' || 
                          (filterStatus.value === 'active' && alert.status === 'active') ||
                          (filterStatus.value === 'expired' && alert.status === 'expired')
        
        // Filter by urgency
        const urgencyMatch = filterUrgency.value === 'all' || 
                           alert.urgency === filterUrgency.value
        
        // Filter by view status
        const viewStatusMatch = filterViewStatus.value === 'all' ||
                              (filterViewStatus.value === 'viewed' && isAlertViewed(alert.id)) ||
                              (filterViewStatus.value === 'unviewed' && !isAlertViewed(alert.id))
        
        return statusMatch && urgencyMatch && viewStatusMatch
      }).sort((a, b) => {
        // Sort by most recent first
        return b.createdAt.toDate() - a.createdAt.toDate()
      })
    })

    onMounted(async () => {
      await checkAdminStatus()
      await fetchAlerts()
      await fetchViewedAlerts()
    })

    return {
      isAdmin,
      alerts,
      filteredAlerts,
      viewedAlerts,
      newAlert,
      showNewAlertModal,
      showAlertDetailModal,
      showConfirmModal,
      isCreatingAlert,
      alertToDelete,
      selectedAlert,
      filterStatus,
      filterUrgency,
      filterViewStatus,
      isAlertViewed,
      viewAlert,
      closeAlertDetail,
      formatDateTime,
      createNewAlert,
      deactivateAlert,
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

.alert-filters {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #2c3e50;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: white;
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
  position: relative;
}

.alert-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.alert-card.unviewed {
  border: 2px solid #ff6b6b;
  background-color: #fef8f8;
}

.unviewed-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #ff6b6b;
  border-radius: 50%;
  margin-right: 8px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
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
  display: flex;
  align-items: center;
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
  color: #666;
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
  max-width: 800px;
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

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-expired {
  background-color: #f8d7da;
  color: #721c24;
}

.alert-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #42b983;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-section p {
  margin: 5px 0;
  color: #555;
}

.user-details-section {
  border-left-color: #dc3545;
}

.user-details-section h4 {
  color: #dc3545;
}

.user-details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 10px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background-color: white;
  border-radius: 5px;
}

.detail-item i {
  color: #6c757d;
  width: 20px;
  text-align: center;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
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
  background-color: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn:hover {
  background-color: #e9ecef;
}

.submit-btn {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover {
  background-color: #369f6e;
}

.submit-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Confirmation Modal Styles */
.confirm-modal {
  background-color: white;
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  max-width: 500px;
  width: 90%;
}

.confirm-icon {
  font-size: 3rem;
  color: #ff6b6b;
  margin-bottom: 20px;
}

.confirm-modal h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.confirm-modal p {
  margin: 0 0 25px 0;
  color: #666;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.delete-btn {
  padding: 10px 20px;
  background-color: #ff6b6b;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.delete-btn:hover {
  background-color: #ee5a52;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .alert-filters {
    flex-direction: column;
    gap: 15px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .alerts-list {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
  }
  
  .user-details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .alert-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .alert-footer {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .alert-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .modal-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .confirm-actions {
    flex-direction: column;
    gap: 10px;
  }
}

/* Animation for new alerts */
@keyframes highlight {
  0% { background-color: rgba(255, 255, 0, 0.3); }
  100% { background-color: transparent; }
}

.new-alert {
  animation: highlight 2s ease-out;
}

/* Status colors */
.status-active {
  color: #28a745;
}

.status-expired {
  color: #dc3545;
}

/* Map container for future use */
.map-container {
  height: 300px;
  width: 100%;
  margin-top: 15px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ddd;
}

/* Loading state */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #42b983;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Empty state enhancements */
.no-alerts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}

.no-alerts i {
  font-size: 3rem;
  color: #95a5a6;
  margin-bottom: 20px;
}

.no-alerts p {
  font-size: 1.2rem;
  color: #666;
  text-align: center;
  max-width: 400px;
}

/* Tooltip styles */
.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  visibility: hidden;
  width: 120px;
  background-color: #555;
  color: #fff;
  text-align: center;
  border-radius: 6px;
  padding: 5px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -60px;
  opacity: 0;
  transition: opacity 0.3s;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}

/* Additional utility classes */
.text-muted {
  color: #6c757d !important;
}

.text-center {
  text-align: center;
}

.mt-3 {
  margin-top: 1rem;
}

.mb-3 {
  margin-bottom: 1rem;
}

.p-3 {
  padding: 1rem;
}
</style>