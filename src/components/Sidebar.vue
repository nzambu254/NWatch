<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>NWatch</h2>
      <p>Community Safety System</p>
    </div>
    
    <nav class="sidebar-nav">
      <template v-if="isAdmin">
        <h3>Admin</h3>
        <router-link to="/admin/dashboard" class="nav-link">
          <i class="fas fa-tachometer-alt"></i> Dashboard
        </router-link>
        <router-link to="/admin/manage-incidents" class="nav-link">
          <i class="fas fa-tasks"></i> Manage Incidents
        </router-link>
        <router-link to="/admin/broadcast-alerts" class="nav-link">
          <i class="fas fa-bullhorn"></i> Broadcast Alerts
        </router-link>
        <router-link to="/admin/emergency-alerts" class="nav-link">
          <i class="fas fa-exclamation-triangle"></i> Emergency Alerts
          <span v-if="hasUnviewedAlerts" class="notification-dot"></span>
        </router-link>
        <router-link to="/admin/neighborhood-map" class="nav-link">
          <i class="fas fa-map"></i> Neighborhood Map
        </router-link>
        <router-link to="/admin/user-management" class="nav-link">
          <i class="fas fa-users"></i> User Management
        </router-link>
        <router-link to="/admin/system-settings" class="nav-link">
          <i class="fas fa-cog"></i> System Settings
        </router-link>
      </template>

      <template v-else-if="isPolice">
        <h3>Police</h3>
        <router-link to="/police/dashboard" class="nav-link">
          <i class="fas fa-tachometer-alt"></i> Dashboard
        </router-link>
        <router-link to="/police/assigned-incidents" class="nav-link">
          <i class="fas fa-clipboard-list"></i> Assigned Incidents
        </router-link>
        <router-link to="/police/emergency-alerts" class="nav-link">
          <i class="fas fa-exclamation-triangle"></i> Emergency Alerts
          <span v-if="hasUnviewedAlerts" class="notification-dot"></span>
        </router-link>
        <router-link to="/police/neighborhood-map" class="nav-link">
          <i class="fas fa-map"></i> Neighborhood Map
        </router-link>
      </template>
      
      <template v-else>
        <h3>Resident</h3>
        <router-link to="/dashboard" class="nav-link">
          <i class="fas fa-tachometer-alt"></i> Dashboard
        </router-link>
        <router-link to="/report-incident" class="nav-link">
          <i class="fas fa-edit"></i> Report Incident
        </router-link>
        <router-link to="/incident-feed" class="nav-link">
          <i class="fas fa-list"></i> Incident Feed
        </router-link>
        <router-link to="/neighborhood-map" class="nav-link">
          <i class="fas fa-map"></i> Neighborhood Map
        </router-link>
        <router-link to="/broadcast-alerts" class="nav-link">
          <i class="fas fa-bell"></i> Broadcast Alerts
          <span v-if="hasUnviewedAlerts" class="notification-dot"></span>
        </router-link>
      </template>
      
      <div class="sidebar-footer">
        <button @click="logout" class="logout-btn">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </nav>
  </aside>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { auth } from '../services/firebase'
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useRouter } from 'vue-router'

export default {
  name: 'Sidebar',
  setup() {
    const isAdmin = ref(false)
    const isPolice = ref(false)
    const hasUnviewedAlerts = ref(false)
    const router = useRouter()
    let alertsUnsubscribe = null
    let userUnsubscribe = null

    const checkUserRole = async (user) => {
      try {
        // Get user document from Firestore
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Check user role and approval status
          isAdmin.value = userData.role === 'admin' && userData.approved
          isPolice.value = userData.role === 'police' && userData.approved
        } else {
          // User document doesn't exist, default to resident
          isAdmin.value = false
          isPolice.value = false
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        isAdmin.value = false
        isPolice.value = false
      }
    }

    const checkForUnviewedAlerts = async (user) => {
      try {
        // Get user's viewed alerts
        const userDocRef = doc(db, 'users', user.uid)
        
        // Listen to user document changes for viewed alerts
        userUnsubscribe = onSnapshot(userDocRef, async (userDoc) => {
          const viewedAlerts = userDoc.exists() ? (userDoc.data().viewedAlerts || []) : []
          
          // Query for active alerts
          let alertsQuery = collection(db, 'emergencies')
          
          // If not admin, only check active alerts
          if (!isAdmin.value) {
            alertsQuery = query(
              alertsQuery,
              where('status', '==', 'active')
            )
          }
          
          // Listen to alerts collection changes
          if (alertsUnsubscribe) {
            alertsUnsubscribe()
          }
          
          alertsUnsubscribe = onSnapshot(alertsQuery, (querySnapshot) => {
            // Check if there are any unviewed alerts
            const unviewedExists = querySnapshot.docs.some(doc => {
              const alertId = doc.id
              return !viewedAlerts.includes(alertId)
            })
            
            hasUnviewedAlerts.value = unviewedExists
          })
        })
      } catch (error) {
        console.error('Error checking for unviewed alerts:', error)
        hasUnviewedAlerts.value = false
      }
    }

    onMounted(() => {
      // Listen for auth state changes
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          await checkUserRole(user)
          await checkForUnviewedAlerts(user)
        } else {
          isAdmin.value = false
          isPolice.value = false
          hasUnviewedAlerts.value = false
          
          // Clean up listeners
          if (alertsUnsubscribe) {
            alertsUnsubscribe()
            alertsUnsubscribe = null
          }
          if (userUnsubscribe) {
            userUnsubscribe()
            userUnsubscribe = null
          }
        }
      })
    })

    onUnmounted(() => {
      // Clean up listeners when component is unmounted
      if (alertsUnsubscribe) {
        alertsUnsubscribe()
      }
      if (userUnsubscribe) {
        userUnsubscribe()
      }
    })

    const logout = async () => {
      try {
        // Clean up listeners before logout
        if (alertsUnsubscribe) {
          alertsUnsubscribe()
          alertsUnsubscribe = null
        }
        if (userUnsubscribe) {
          userUnsubscribe()
          userUnsubscribe = null
        }
        
        await auth.signOut()
        // Clear any session data
        sessionStorage.removeItem('userData')
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    return { 
      isAdmin, 
      isPolice,
      hasUnviewedAlerts,
      logout 
    }
  }
}
</script>

<style scoped>
.sidebar {
  width: 250px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  background-color: #2c3e50;
  color: white;
  padding: 20px 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.sidebar-header p {
  margin: 5px 0 0;
  font-size: 0.8rem;
  opacity: 0.8;
}

.sidebar-nav {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
}

.sidebar-nav h3 {
  padding: 0 20px;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin: 15px 0 10px;
  opacity: 0.7;
  letter-spacing: 0.5px;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  position: relative;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.router-link-exact-active {
  background-color: rgba(66, 185, 131, 0.2);
  color: #42b983;
  border-left: 3px solid #42b983;
}

.nav-link i {
  margin-right: 12px;
  width: 20px;
  text-align: center;
  font-size: 1rem;
}

.notification-dot {
  position: absolute;
  top: 8px;
  right: 15px;
  width: 8px;
  height: 8px;
  background-color: #ff6b6b;
  border-radius: 50%;
  animation: pulse 2s infinite;
  box-shadow: 0 0 6px rgba(255, 107, 107, 0.8);
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.sidebar-footer {
  margin-top: auto;
  padding: 15px 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  width: 100%;
  padding: 12px 20px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.logout-btn i {
  margin-right: 12px;
  font-size: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .sidebar {
    width: 220px;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.active {
    transform: translateX(0);
  }
  
  .notification-dot {
    right: 12px;
  }
}
</style>