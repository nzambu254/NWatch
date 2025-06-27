<template>
  <div class="app-container">
    <Sidebar v-if="isAuthenticated" />
    <div class="main-content" :class="{ 'with-sidebar': isAuthenticated }">
      <router-view />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { auth } from './services/firebase'
import { useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

export default {
  name: 'App',
  components: { Sidebar },
  setup() {
    const isAuthenticated = ref(false)
    const router = useRouter()

    onMounted(() => {
      auth.onAuthStateChanged(user => {
        isAuthenticated.value = !!user
        if (!user && router.currentRoute.value.meta.requiresAuth) {
          router.push('/login')
        }
      })
    })

    return { isAuthenticated }
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
}

.with-sidebar {
  margin-left: 250px;
}

/* Add your global styles here */
</style>