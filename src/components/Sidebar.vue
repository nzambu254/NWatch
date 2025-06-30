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
import { ref, onMounted } from 'vue'
import { auth } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useRouter } from 'vue-router'

export default {
  name: 'Sidebar',
  setup() {
    const isAdmin = ref(false)
    const isPolice = ref(false)
    const router = useRouter()

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

    onMounted(() => {
      // Listen for auth state changes
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          await checkUserRole(user)
        } else {
          isAdmin.value = false
          isPolice.value = false
        }
      })
    })

    const logout = async () => {
      try {
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
}
</style>