<template>
  <div class="app-container">
    <!-- Top Navigation Bar -->
    <nav v-if="isAuthenticated && !isAuthPage" class="top-navbar">
      <div class="navbar-content">
        <div class="navbar-title">
          <h3>NWatch</h3>
        </div>
        <div class="navbar-right">
          <span class="user-name">{{ currentUserName }}</span>
          <button @click="logout" class="logout-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>

    <div class="content-wrapper" :class="{ 'with-navbar': isAuthenticated && !isAuthPage }">
      <Sidebar v-if="isAuthenticated && !isAuthPage" />
      <div class="main-content" :class="{ 'with-sidebar': isAuthenticated && !isAuthPage }">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { auth } from './services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './services/firebase'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

export default {
  name: 'App',
  components: { Sidebar },
  setup() {
    const isAuthenticated = ref(false)
    const authReady = ref(false)
    const currentUserName = ref('')
    const router = useRouter()
    const route = useRoute()
    let unsubscribe = null

    // Check if current route is an auth page
    const isAuthPage = computed(() => {
      const authPages = ['/login', '/register', '/']
      return authPages.includes(route.path)
    })

    const getCurrentUserName = async (user) => {
      try {
        const userDocRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          currentUserName.value = userData.name || userData.email || 'User'
        } else {
          currentUserName.value = user.email || 'User'
        }
      } catch (error) {
        console.error('Error getting user name:', error)
        currentUserName.value = user.email || 'User'
      }
    }

    const logout = async () => {
      try {
        await auth.signOut()
        // Clear any session data
        sessionStorage.removeItem('userData')
        currentUserName.value = ''
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    onMounted(() => {
      // Single auth state listener
      unsubscribe = auth.onAuthStateChanged(async user => {
        isAuthenticated.value = !!user
        authReady.value = true
        
        if (user) {
          await getCurrentUserName(user)
        } else {
          currentUserName.value = ''
        }
        
        // Only handle redirects if not already handled by router
        if (!user && route.meta.requiresAuth && !isAuthPage.value) {
          // User logged out while on protected route
          router.push('/login')
        }
      })
    })

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe()
      }
    })

    return {
      isAuthenticated,
      authReady,
      isAuthPage,
      currentUserName,
      logout
    }
  }
}
</script>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: #2c3e50;
  color: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.navbar-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  /* Removed margin-left to start from the beginning */
}

.navbar-title h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-name {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.logout-btn {
  background: none;
  border: none;
  color: #ff4757;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  font-size: 1.1rem;
}

.logout-btn:hover {
  background-color: rgba(255, 71, 87, 0.1);
  color: #ff3742;
  transform: scale(1.05);
}

.logout-btn svg {
  width: 16px;
  height: 16px;
}

.content-wrapper {
  flex: 1;
  display: flex;
}

.content-wrapper.with-navbar {
  margin-top: 60px; /* Account for navbar height */
}

.main-content {
  flex: 1;
  padding: 20px;
  transition: margin-left 0.3s ease;
}

.with-sidebar {
  margin-left: 250px;
}

/* Prevent layout shift during auth state changes */
.main-content:not(.with-sidebar) {
  margin-left: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .navbar-content {
    padding: 0 15px;
  }
  
  .navbar-title h3 {
    font-size: 1.1rem;
  }
  
  .user-name {
    font-size: 0.85rem;
  }
  
  .logout-btn {
    padding: 6px 10px;
    font-size: 1rem;
  }
  
  .logout-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .main-content.with-sidebar {
    margin-left: 0;
  }
}

/* Add your global styles here */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}
</style>