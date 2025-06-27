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
import { db } from '../services/firebase' // Make sure you export db from your firebase config
import { useRouter } from 'vue-router'

export default {
  name: 'Sidebar',
  setup() {
    const isAdmin = ref(false)
    const router = useRouter()

    const checkUserRole = async (user) => {
      try {
        // Get user document from Firestore
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          // Check if user has admin role
          isAdmin.value = userData.role === 'admin' || userData.isAdmin === true
        } else {
          // User document doesn't exist, default to resident
          isAdmin.value = false
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        isAdmin.value = false // Default to resident on error
      }
    }

    onMounted(() => {
      // Listen for auth state changes
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          await checkUserRole(user)
        } else {
          isAdmin.value = false
        }
      })
    })

    const logout = async () => {
      try {
        await auth.signOut()
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    return { isAdmin, logout }
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
}

.sidebar-header {
  padding: 0 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.sidebar-header p {
  margin: 5px 0 0;
  font-size: 0.8rem;
  opacity: 0.8;
}

.sidebar-nav {
  padding: 20px 0;
}

.sidebar-nav h3 {
  padding: 0 20px;
  font-size: 0.9rem;
  text-transform: uppercase;
  margin-bottom: 10px;
  opacity: 0.7;
}

.nav-link {
  display: block;
  padding: 10px 20px;
  color: white;
  text-decoration: none;
  transition: background-color 0.3s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-exact-active {
  background-color: #42b983;
}

.nav-link i {
  margin-right: 10px;
  width: 20px;
  text-align: center;
}

.sidebar-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  width: 100%;
  padding: 10px 20px;
  background: none;
  border: none;
  color: white;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logout-btn i {
  margin-right: 10px;
}
</style>