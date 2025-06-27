<template>
  <div class="app-container">
    <Sidebar v-if="isAuthenticated && !isAuthPage" />
    <div class="main-content" :class="{ 'with-sidebar': isAuthenticated && !isAuthPage }">
      <router-view />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { auth } from './services/firebase'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

export default {
  name: 'App',
  components: { Sidebar },
  setup() {
    const isAuthenticated = ref(false)
    const authReady = ref(false)
    const router = useRouter()
    const route = useRoute()
    let unsubscribe = null

    // Check if current route is an auth page
    const isAuthPage = computed(() => {
      const authPages = ['/login', '/register', '/']
      return authPages.includes(route.path)
    })

    onMounted(() => {
      // Single auth state listener
      unsubscribe = auth.onAuthStateChanged(user => {
        isAuthenticated.value = !!user
        authReady.value = true
        
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
      isAuthPage
    }
  }
}
</script>

<style>
.app-container {
  display: flex;
  min-height: 100vh;
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