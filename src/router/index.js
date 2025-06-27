import { createRouter, createWebHistory } from 'vue-router'
import { auth, db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

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

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  const user = auth.currentUser

  if (requiresAuth && !user) {
    next('/login')
  } else if (requiresAuth && requiresAdmin) {
    // Check if user is admin
    try {
      const isAdmin = await checkIfAdmin(user.uid)
      if (!isAdmin) {
        next('/dashboard') // Redirect non-admins to resident dashboard
      } else {
        next()
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      next('/dashboard') // Redirect to resident dashboard on error
    }
  } else {
    next()
  }
})

async function checkIfAdmin(uid) {
  try {
    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid))
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      // Check if user has admin role and is approved
      return userData.role === 'admin' && userData.approved === true
    }
    
    return false
  } catch (error) {
    console.error('Error fetching user data:', error)
    return false
  }
}

export default router