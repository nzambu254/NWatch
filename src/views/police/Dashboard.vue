<template>
  <div class="police-dashboard">
    <h1>Police Dashboard</h1>
    
    <div class="stats-container">
      <div class="stat-card">
        <h3>Assigned Incidents</h3>
        <p class="stat-value">{{ assignedIncidentsCount }}</p>
        <router-link to="/police/assigned-incidents" class="stat-link">View All</router-link>
      </div>
      
      <div class="stat-card">
        <h3>Pending Actions</h3>
        <p class="stat-value">{{ pendingActionsCount }}</p>
        <router-link to="/police/assigned-incidents?filter=pending" class="stat-link">View Pending</router-link>
      </div>
      
      <div class="stat-card">
        <h3>Resolved Cases</h3>
        <p class="stat-value">{{ resolvedCasesCount }}</p>
        <router-link to="/police/assigned-incidents?filter=resolved" class="stat-link">View Resolved</router-link>
      </div>
    </div>
    
    <div class="recent-activity">
      <h2>Recent Activity</h2>
      <div v-if="loadingActivities" class="loading">Loading activities...</div>
      <ul v-else class="activity-list">
        <li v-if="recentActivities.length === 0" class="no-activities">
          No recent activities found
        </li>
        <li v-for="activity in recentActivities" :key="activity.id" class="activity-item">
          <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
          <span class="activity-text">{{ generateActivityText(activity) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { auth, db } from '../../services/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

export default {
  name: 'PoliceDashboard',
  setup() {
    const assignedIncidentsCount = ref(0)
    const pendingActionsCount = ref(0)
    const resolvedCasesCount = ref(0)
    const recentActivities = ref([])
    const loadingActivities = ref(true)

    const fetchPoliceData = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        // Fetch assigned incidents
        const incidentsQuery = query(
          collection(db, 'incidents'),
          where('assignedOfficerId', '==', user.uid)
        )
        const incidentsSnapshot = await getDocs(incidentsQuery)
        
        // Calculate counts
        let pending = 0
        let resolved = 0
        incidentsSnapshot.forEach(doc => {
          const data = doc.data()
          if (data.status === 'resolved') {
            resolved++
          } else {
            pending++
          }
        })
        
        assignedIncidentsCount.value = incidentsSnapshot.size
        pendingActionsCount.value = pending
        resolvedCasesCount.value = resolved

        // Fetch recent activities
        await fetchRecentActivities(user.uid)
      } catch (error) {
        console.error('Error fetching police dashboard data:', error)
      }
    }

    const fetchRecentActivities = async (officerId) => {
      try {
        loadingActivities.value = true
        
        // Get recent incident updates
        const activitiesQuery = query(
          collection(db, 'incidents'),
          where('assignedOfficerId', '==', officerId),
          orderBy('updatedAt', 'desc'),
          limit(5)
        )
        
        const snapshot = await getDocs(activitiesQuery)
        recentActivities.value = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            timestamp: data.updatedAt || data.reportedAt
          }
        })
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        loadingActivities.value = false
      }
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      const date = timestamp.toDate()
      const now = new Date()
      const diffInHours = Math.abs(now - date) / 36e5
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else if (diffInHours < 48) {
        return 'Yesterday'
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      }
    }

    const generateActivityText = (activity) => {
      if (activity.status === 'resolved') {
        return `Resolved incident #${activity.id.slice(0, 8)}`
      }
      if (activity.updatedAt) {
        return `Updated incident #${activity.id.slice(0, 8)}`
      }
      return `Assigned new incident #${activity.id.slice(0, 8)}`
    }

    onMounted(() => {
      fetchPoliceData()
    })

    return {
      assignedIncidentsCount,
      pendingActionsCount,
      resolvedCasesCount,
      recentActivities,
      loadingActivities,
      formatTime,
      generateActivityText
    }
  }
}
</script>

<style scoped>
.police-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-container {
  display: flex;
  gap: 20px;
  margin: 30px 0;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 200px;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 10px;
  color: #2c3e50;
  font-size: 1.1rem;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #42b983;
  margin: 10px 0;
}

.stat-link {
  display: inline-block;
  margin-top: 10px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}

.stat-link:hover {
  text-decoration: underline;
}

.recent-activity {
  margin-top: 40px;
}

.recent-activity h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #7f8c8d;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.no-activities {
  padding: 20px;
  text-align: center;
  color: #7f8c8d;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.activity-item {
  padding: 15px;
  background: #fff;
  margin-bottom: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.activity-time {
  font-weight: bold;
  color: #7f8c8d;
  min-width: 100px;
}

.activity-text {
  flex: 1;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .stats-container {
    flex-direction: column;
  }
  
  .stat-card {
    min-width: 100%;
  }
}
</style>