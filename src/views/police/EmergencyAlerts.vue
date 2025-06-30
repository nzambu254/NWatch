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
    </div>

    <div class="alerts-list">
      <div v-if="filteredAlerts.length === 0" class="no-alerts">
        <i class="fas fa-bell-slash"></i>
        <p>No alerts found matching your criteria</p>
      </div>

      <div v-for="alert in filteredAlerts" :key="alert.id" class="alert-card" :class="`urgency-${alert.urgency}`">
        <div class="alert-header">
          <div class="alert-title">{{ alert.type === 'emergency_contact' ? 'Emergency Contact' : alert.title || 'Emergency Alert' }}</div>
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
              <span>Reported by: {{ alert.reporterEmail || 'Anonymous' }}</span>
            </div>
          </div>
        </div>
        <div class="alert-footer">
          <div class="alert-status">{{ alert.status }}</div>
          <div class="alert-actions" v-if="isAdmin">
            <button v-if="alert.status === 'active'" @click="deactivateAlert(alert.id)" class="action-btn deactivate">
              <i class="fas fa-ban"></i> Deactivate
            </button>
            <button @click="confirmDeleteAlert(alert.id)" class="action-btn delete">
              <i class="fas fa-trash"></i> Delete
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
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'

export default {
  name: 'EmergencyAlerts',
  setup() {
    const router = useRouter()
    const isAdmin = ref(false)
    const alerts = ref([])
    const showNewAlertModal = ref(false)
    const showConfirmModal = ref(false)
    const isCreatingAlert = ref(false)
    const alertToDelete = ref(null)
    const filterStatus = ref('active')
    const filterUrgency = ref('all')

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
        
        return statusMatch && urgencyMatch
      }).sort((a, b) => {
        // Sort by most recent first
        return b.createdAt.toDate() - a.createdAt.toDate()
      })
    })

    onMounted(async () => {
      await checkAdminStatus()
      await fetchAlerts()
    })

    return {
      isAdmin,
      alerts,
      filteredAlerts,
      newAlert,
      showNewAlertModal,
      showConfirmModal,
      isCreatingAlert,
      alertToDelete,
      filterStatus,
      filterUrgency,
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
/* Your existing styles remain the same */
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.alert-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
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
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
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
  transition: background-color 0.3s;
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
  transition: background-color 0.3s;
}

.submit-btn:hover {
  background-color: #369f6e;
}

.submit-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Confirm Modal */
.confirm-modal {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  padding: 30px;
  text-align: center;
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
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #ee5a52;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .alert-filters {
    flex-direction: column;
    gap: 10px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .alerts-list {
    grid-template-columns: 1fr;
  }
}
</style>