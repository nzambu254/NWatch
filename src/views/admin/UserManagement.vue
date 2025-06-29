<template>
  <div class="user-management">
    <div class="header">
      <h1>User Management</h1>
      <div class="search-bar">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search users by name or email..."
          @input="searchUsers"
        >
        <button @click="refreshUsers" class="refresh-btn">
          🔄 Refresh
        </button>
      </div>
    </div>

    <div class="user-stats">
      <div class="stat-card">
        <div class="stat-value">{{ totalUsers }}</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ activeUsers }}</div>
        <div class="stat-label">Active Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ newUsers }}</div>
        <div class="stat-label">New This Week</div>
      </div>
    </div>

    <div class="user-list">
      <div 
        v-for="user in filteredUsers" 
        :key="user.uid"
        class="user-card"
        @click="selectUser(user)"
      >
        <div class="user-avatar">
          {{ getUserInitials(user.firstName, user.lastName) }}
        </div>
        <div class="user-info">
          <div class="user-name">{{ getUserFullName(user) }}</div>
          <div class="user-email">{{ user.email }}</div>
          <div class="user-location">
            <span v-if="user.location">📍 {{ user.location }}</span>
            <span v-else>📍 Location not set</span>
          </div>
        </div>
        <div class="user-status" :class="user.disabled ? 'inactive' : 'active'">
          {{ user.disabled ? 'Inactive' : 'Active' }}
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-indicator">
      Loading users...
    </div>

    <div v-if="selectedUser" class="modal-overlay" @click.self="selectedUser = null">
      <div class="user-detail-modal">
        <div class="modal-header">
          <h2>User Details</h2>
          <button @click="selectedUser = null" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="user-profile">
            <div class="profile-avatar">
              {{ getUserInitials(selectedUser.firstName, selectedUser.lastName) }}
            </div>
            <div class="profile-info">
              <h3>{{ getUserFullName(selectedUser) }}</h3>
              <p>{{ selectedUser.email }}</p>
              <p v-if="selectedUser.phone">📱 {{ selectedUser.phone }}</p>
            </div>
          </div>

          <div class="user-details">
            <div class="detail-section">
              <h4>Account Information</h4>
              <div class="detail-row">
                <span class="detail-label">User ID:</span>
                <span class="detail-value">{{ selectedUser.uid }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Role:</span>
                <span class="detail-value">{{ selectedUser.role ? selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1) : 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" :class="selectedUser.disabled ? 'inactive' : 'active'">
                  {{ selectedUser.disabled ? 'Inactive' : 'Active' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Created:</span>
                <span class="detail-value">{{ formatDate(selectedUser.createdAt) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Last Sign-in:</span>
                <span class="detail-value">{{ formatDate(selectedUser.lastSignInTime) }}</span>
              </div>
              <div class="detail-row" v-if="selectedUser.role === 'admin'">
                <span class="detail-label">Approval:</span>
                <span class="detail-value" :class="selectedUser.approved ? 'active' : 'inactive'">
                  {{ selectedUser.approved ? 'Approved' : 'Pending Approval' }}
                </span>
                <button 
                  v-if="selectedUser.role === 'admin' && !selectedUser.approved" 
                  @click="toggleAdminApproval(selectedUser)" 
                  class="action-btn approve-btn"
                  style="margin-left: 10px;"
                >
                  Approve Admin
                </button>
              </div>
            </div>

            <div class="detail-section" v-if="selectedUser.role === 'resident'">
              <h4>Resident Details</h4>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">{{ selectedUser.location || 'Not specified' }}</span>
              </div>
              </div>
          </div>

          <div class="user-actions">
            <button 
              @click="toggleUserStatus(selectedUser)"
              :class="['action-btn', selectedUser.disabled ? 'activate-btn' : 'disable-btn']"
            >
              {{ selectedUser.disabled ? 'Activate Account' : 'Disable Account' }}
            </button>
            <button @click="showResetPassword = true" class="action-btn reset-btn">
              Reset Password
            </button>
            <button @click="showDeleteConfirmation = true" class="action-btn delete-btn">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showResetPassword" class="modal-overlay" @click.self="showResetPassword = false">
      <div class="confirmation-modal">
        <div class="modal-header">
          <h3>Reset Password</h3>
          <button @click="showResetPassword = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to reset password for {{ selectedUser.email }}?</p>
          <p>A password reset link will be emailed to the user.</p>
        </div>
        <div class="modal-actions">
          <button @click="resetUserPassword" class="confirm-btn">Confirm Reset</button>
          <button @click="showResetPassword = false" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteConfirmation" class="modal-overlay" @click.self="showDeleteConfirmation = false">
      <div class="confirmation-modal">
        <div class="modal-header">
          <h3>Delete Account</h3>
          <button @click="showDeleteConfirmation = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to permanently delete {{ selectedUser.email }}?</p>
          <p class="warning-text">⚠️ This action cannot be undone!</p>
        </div>
        <div class="modal-actions">
          <button @click="deleteUserAccount" class="delete-btn">Delete Permanently</button>
          <button @click="showDeleteConfirmation = false" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="toastMessage" class="toast-notification" :class="toastType">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { 
  getAuth, 
  sendPasswordResetEmail
} from 'firebase/auth'
import { db } from '@/services/firebase'
import { 
  doc, 
  deleteDoc, 
  collection, 
  getDocs, 
  updateDoc,
  query,
  orderBy
} from 'firebase/firestore'

export default {
  name: 'UserManagement',
  setup() {
    const auth = getAuth()
    const users = ref([])
    const filteredUsers = ref([])
    const selectedUser = ref(null)
    const searchQuery = ref('')
    const loading = ref(false)
    const showResetPassword = ref(false)
    const showDeleteConfirmation = ref(false)
    const toastMessage = ref('')
    const toastType = ref('success')

    // Helper to get full name
    const getUserFullName = (user) => {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      return user.email; // Fallback to email if name isn't set
    };

    // Load all users from Firestore
    const loadUsers = async () => {
      loading.value = true
      try {
        const usersCollection = collection(db, 'users')
        const usersQuery = query(usersCollection, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(usersQuery)
        
        const usersData = []
        querySnapshot.forEach((doc) => {
          usersData.push({
            uid: doc.id,
            ...doc.data()
          })
        })
        
        users.value = usersData
        filteredUsers.value = usersData
      } catch (error) {
        console.error('Error loading users:', error)
        showToast('Failed to load users', 'error')
      } finally {
        loading.value = false
      }
    }

    // Search users by name or email
    const searchUsers = () => {
      if (!searchQuery.value) {
        filteredUsers.value = users.value
        return
      }
      
      const queryText = searchQuery.value.toLowerCase()
      filteredUsers.value = users.value.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(queryText)) ||
        (user.lastName && user.lastName.toLowerCase().includes(queryText)) ||
        user.email.toLowerCase().includes(queryText)
      )
    }

    // Select user function
    const selectUser = (user) => {
      selectedUser.value = user
    }

    // Toggle user active/inactive status
    const toggleUserStatus = async (user) => {
      try {
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          disabled: !user.disabled,
          updatedAt: new Date()
        })
        
        showToast(`User ${!user.disabled ? 'disabled' : 'activated'} successfully`)
        
        // Update local state
        const userIndex = users.value.findIndex(u => u.uid === user.uid)
        if (userIndex !== -1) {
          users.value[userIndex].disabled = !user.disabled
        }
        
        // Update filtered users
        const filteredIndex = filteredUsers.value.findIndex(u => u.uid === user.uid)
        if (filteredIndex !== -1) {
          filteredUsers.value[filteredIndex].disabled = !user.disabled
        }
        
        // Update selected user
        if (selectedUser.value && selectedUser.value.uid === user.uid) {
          selectedUser.value.disabled = !user.disabled
        }
        
      } catch (error) {
        console.error('Error updating user status:', error)
        showToast('Failed to update user status', 'error')
      }
    }

    // Toggle admin approval status
    const toggleAdminApproval = async (user) => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          approved: !user.approved,
          updatedAt: new Date()
        });

        showToast(`Admin ${user.email} ${!user.approved ? 'approved' : 'unapproved'} successfully`);

        // Update local state
        const userIndex = users.value.findIndex(u => u.uid === user.uid);
        if (userIndex !== -1) {
          users.value[userIndex].approved = !user.approved;
        }

        const filteredIndex = filteredUsers.value.findIndex(u => u.uid === user.uid);
        if (filteredIndex !== -1) {
          filteredUsers.value[filteredIndex].approved = !user.approved;
        }

        if (selectedUser.value && selectedUser.value.uid === user.uid) {
          selectedUser.value.approved = !user.approved;
        }

      } catch (error) {
        console.error('Error updating admin approval:', error);
        showToast('Failed to update admin approval status', 'error');
      }
    };


    // Reset user password
    const resetUserPassword = async () => {
      try {
        await sendPasswordResetEmail(auth, selectedUser.value.email)
        showToast('Password reset email sent successfully')
        showResetPassword.value = false
      } catch (error) {
        console.error('Error sending reset email:', error)
        showToast('Failed to send reset email', 'error')
      }
    }

    // Delete user account
    const deleteUserAccount = async () => {
      try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', selectedUser.value.uid))
        
        showToast('User account deleted from Firestore. Note: Firebase Auth record still exists and should be deleted via Admin SDK, usually through a Cloud Function.')
        showDeleteConfirmation.value = false
        selectedUser.value = null
        loadUsers() // Reload users after deletion
        
      } catch (error) {
        console.error('Error deleting user:', error)
        showToast('Failed to delete user account', 'error')
      }
    }

    // Helper functions
    const getUserInitials = (firstName, lastName) => {
      let initials = '';
      if (firstName) initials += firstName[0];
      if (lastName) initials += lastName[0];
      return initials.toUpperCase() || '?';
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return 'Unknown'
      // Handle Firestore Timestamp objects
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString('en-KE', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
      }
      // Handle regular Date objects or strings
      return new Date(timestamp).toLocaleString('en-KE', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    const showToast = (message, type = 'success') => {
      toastMessage.value = message
      toastType.value = type
      setTimeout(() => {
        toastMessage.value = ''
      }, 3000)
    }

    // Computed properties
    const totalUsers = computed(() => users.value.length)
    
    const activeUsers = computed(() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      return users.value.filter(user => {
        if (!user.lastSignInTime) return false
        
        let lastSignInDate
        if (user.lastSignInTime.toDate) {
          lastSignInDate = user.lastSignInTime.toDate()
        } else {
          lastSignInDate = new Date(user.lastSignInTime)
        }
        
        return lastSignInDate >= today
      }).length
    })
    
    const newUsers = computed(() => {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      return users.value.filter(user => {
        if (!user.createdAt) return false
        
        let createdDate
        if (user.createdAt.toDate) {
          createdDate = user.createdAt.toDate()
        } else {
          createdDate = new Date(user.createdAt)
        }
        
        return createdDate >= oneWeekAgo
      }).length
    })

    // Lifecycle hooks
    onMounted(() => {
      loadUsers()
    })

    return {
      users,
      filteredUsers,
      selectedUser,
      searchQuery,
      loading,
      showResetPassword,
      showDeleteConfirmation,
      toastMessage,
      toastType,
      totalUsers,
      activeUsers,
      newUsers,
      loadUsers,
      searchUsers,
      selectUser,
      toggleUserStatus,
      toggleAdminApproval, // Expose the new function
      resetUserPassword,
      deleteUserAccount,
      getUserInitials,
      getUserFullName, // Expose the new function
      formatDate,
      refreshUsers: loadUsers
    }
  }
}
</script>

<style scoped>
.user-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.search-bar input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.refresh-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

.user-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 14px;
}

.user-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.user-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.user-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: bold;
  margin-bottom: 3px;
}

.user-email {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 5px;
  word-break: break-all;
}

.user-location {
  font-size: 13px;
  color: #555;
}

.user-status {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: bold;
}

.user-status.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.user-status.inactive {
  background: #ffebee;
  color: #c62828;
}

.loading-indicator {
  text-align: center;
  padding: 20px;
  color: #7f8c8d;
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

.user-detail-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 20px rgba(0,0,0,0.2);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #7f8c8d;
}

.modal-body {
  padding: 20px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 28px;
}

.profile-info h3 {
  margin: 0 0 5px;
  color: #2c3e50;
}

.profile-info p {
  margin: 5px 0;
  color: #7f8c8d;
}

.user-details {
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 15px;
  color: #2c3e50;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

.detail-row {
  display: flex;
  margin-bottom: 10px;
}

.detail-label {
  font-weight: bold;
  width: 120px;
  color: #555;
}

.detail-value {
  flex: 1;
}

.detail-value.active {
  color: #2e7d32;
  font-weight: bold;
}

.detail-value.inactive {
  color: #c62828;
  font-weight: bold;
}

.user-actions {
  display: flex;
  gap: 10px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.activate-btn {
  background: #e8f5e9;
  color: #2e7d32;
}

.activate-btn:hover {
  background: #c8e6c9;
}

.disable-btn {
  background: #fff3e0;
  color: #e65100;
}

.disable-btn:hover {
  background: #ffe0b2;
}

.reset-btn {
  background: #e3f2fd;
  color: #1565c0;
}

.reset-btn:hover {
  background: #bbdefb;
}

.delete-btn {
  background: #ffebee;
  color: #c62828;
}

.delete-btn:hover {
  background: #ffcdd2;
}

.approve-btn {
  background-color: #4CAF50; /* Green */
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.approve-btn:hover {
  background-color: #45a049;
}

.confirmation-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.2);
}

.confirmation-modal .modal-body {
  padding: 20px;
}

.confirmation-modal p {
  margin: 0 0 15px;
}

.warning-text {
  color: #c62828;
  font-weight: bold;
}

.modal-actions {
  display: flex;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
}

.confirm-btn, .cancel-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.confirm-btn {
  background: #2e7d32;
  color: white;
}

.confirm-btn:hover {
  background: #1b5e20;
}

.cancel-btn {
  background: #f5f5f5;
  color: #333;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.delete-btn {
  background: #c62828;
  color: white;
}

.delete-btn:hover {
  background: #b71c1c;
}

.toast-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 4px;
  color: white;
  box-shadow: 0 3px 10px rgba(0,0,0,0.2);
  z-index: 1001;
  animation: slideIn 0.3s ease-out;
}

.toast-notification.success {
  background: #2e7d32;
}

.toast-notification.error {
  background: #c62828;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>