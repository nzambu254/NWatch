import { createRouter, createWebHistory } from 'vue-router'
import { auth, db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const routes = [
  {
    path: '/',
    name: 'LandingPage',
    component: () => import('../views/LandingPage.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Auth/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Auth/Register.vue')
  },
  // Admin Routes
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/admin/Dashboard.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/manage-incidents',
    name: 'ManageIncidents',
    component: () => import('../views/admin/ManageIncidents.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/broadcast-alerts',
    name: 'BroadcastAlerts',
    component: () => import('../views/admin/BroadcastAlerts.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/emergency-alerts',
    name: 'AdminEmergencyAlerts',
    component: () => import('../views/admin/EmergencyAlerts.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/neighborhood-map',
    name: 'AdminNeighborhoodMap',
    component: () => import('../views/admin/NeighborhoodMap.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/user-management',
    name: 'UserManagement',
    component: () => import('../views/admin/UserManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/system-settings',
    name: 'SystemSettings',
    component: () => import('../views/admin/SystemSettings.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  // Police Routes
  {
    path: '/police/dashboard',
    name: 'PoliceDashboard',
    component: () => import('../views/police/Dashboard.vue'),
    meta: { requiresAuth: true, requiresPolice: true }
  },
  {
    path: '/police/assigned-incidents',
    name: 'AssignedIncidents',
    component: () => import('../views/police/AssignedIncidents.vue'),
    meta: { requiresAuth: true, requiresPolice: true }
  },
  {
    path: '/police/emergency-alerts',
    name: 'PoliceEmergencyAlerts',
    component: () => import('../views/police/EmergencyAlerts.vue'),
    meta: { requiresAuth: true, requiresPolice: true }
  },
  {
    path: '/police/neighborhood-map',
    name: 'PoliceNeighborhoodMap',
    component: () => import('../views/police/NeighborhoodMap.vue'),
    meta: { requiresAuth: true, requiresPolice: true }
  },
  {
    path: '/police/incident-details/:id',
    name: 'PoliceIncidentDetails',
    component: () => import('../views/police/IncidentDetails.vue'),
    meta: { requiresAuth: true, requiresPolice: true },
    props: true
  },
  // Resident Routes
  {
    path: '/dashboard',
    name: 'ResidentDashboard',
    component: () => import('../views/residents/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/report-incident',
    name: 'ReportIncident',
    component: () => import('../views/residents/ReportIncident.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/incident-feed',
    name: 'IncidentFeed',
    component: () => import('../views/residents/IncidentFeed.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/neighborhood-map',
    name: 'NeighborhoodMap',
    component: () => import('../views/residents/NeighborhoodMap.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/broadcast-alerts',
    name: 'ResidentBroadcastAlerts',
    component: () => import('../views/residents/BroadcastAlerts.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global variable to track authentication state
let authReady = false
let currentUserData = null

// Initialize authentication state listener - single source of truth
const initializeAuth = onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Check if we have cached user data
      const cachedData = sessionStorage.getItem('userData')
      
      if (cachedData) {
        currentUserData = JSON.parse(cachedData)
      } else {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          currentUserData = {
            uid: user.uid,
            email: user.email,
            role: userData.role,
            approved: userData.approved
          }
          // Cache the data
          sessionStorage.setItem('userData', JSON.stringify(currentUserData))
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      currentUserData = null
    }
  } else {
    currentUserData = null
    sessionStorage.removeItem('userData')
  }
  authReady = true
})

router.beforeEach(async (to, from, next) => {
  // Wait for auth to be ready
  if (!authReady) {
    await new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe()
        resolve()
      })
    })
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  const requiresPolice = to.matched.some(record => record.meta.requiresPolice)
  const user = auth.currentUser

  // If route requires authentication and user is not logged in
  if (requiresAuth && !user) {
    next('/login')
    return
  }

  // If user is logged in and trying to access login page, redirect to appropriate dashboard
  if (user && to.path === '/login') {
    if (currentUserData) {
      let redirectPath = '/dashboard' // default for residents
      
      if (currentUserData.role === 'admin') {
        redirectPath = '/admin/dashboard'
      } else if (currentUserData.role === 'police') {
        redirectPath = '/police/dashboard'
      }
      
      next(redirectPath)
    } else {
      next('/dashboard') // fallback
    }
    return
  }

  // If route requires admin access
  if (requiresAuth && requiresAdmin) {
    if (!currentUserData || currentUserData.role !== 'admin' || !currentUserData.approved) {
      // Redirect to appropriate dashboard based on role
      const redirectPath = currentUserData?.role === 'police' ? '/police/dashboard' : '/dashboard'
      next(redirectPath)
      return
    }
  }

  // If route requires police access
  if (requiresAuth && requiresPolice) {
    if (!currentUserData || currentUserData.role !== 'police' || !currentUserData.approved) {
      // Redirect to appropriate dashboard based on role
      const redirectPath = currentUserData?.role === 'admin' ? '/admin/dashboard' : '/dashboard'
      next(redirectPath)
      return
    }
  }

  next()
})

export default router