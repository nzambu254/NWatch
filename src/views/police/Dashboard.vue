<template>
  <div class="police-dashboard">
    <div class="dashboard-header">
      <h1>Police Dashboard</h1>
      <div class="header-actions">
        <button class="refresh-btn" @click="fetchPoliceData">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
        <div class="last-updated">
          Last updated: {{ lastUpdated }}
        </div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-clipboard-list"></i>
        </div>
        <div class="stat-value">{{ assignedIncidentsCount }}</div>
        <div class="stat-label">Assigned Incidents</div>
        <div class="stat-trend" :class="incidentTrend >= 0 ? 'up' : 'down'">
          <i class="fas" :class="incidentTrend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
          {{ Math.abs(incidentTrend) }}% from last week
        </div>
        <router-link to="/police/assigned-incidents" class="stat-link">View All</router-link>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-hourglass-half"></i>
        </div>
        <div class="stat-value">{{ pendingActionsCount }}</div>
        <div class="stat-label">Pending Actions</div>
        <div class="stat-trend" :class="pendingTrend >= 0 ? 'up' : 'down'">
          <i class="fas" :class="pendingTrend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
          {{ Math.abs(pendingTrend) }}% from last week
        </div>
        <router-link to="/police/assigned-incidents?filter=pending" class="stat-link">View Pending</router-link>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-value">{{ resolvedCasesCount }}</div>
        <div class="stat-label">Resolved Cases</div>
        <div class="stat-trend" :class="resolvedTrend >= 0 ? 'up' : 'down'">
          <i class="fas" :class="resolvedTrend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
          {{ Math.abs(resolvedTrend) }}% from last week
        </div>
        <router-link to="/police/assigned-incidents?filter=resolved" class="stat-link">View Resolved</router-link>
      </div>
    </div>

    <div class="dashboard-sections">
      <section class="recent-activity">
        <div class="section-header">
          <h2>Recent Activity</h2>
          <router-link to="/police/activity-log" class="view-all">
            View All <i class="fas fa-chevron-right"></i>
          </router-link>
        </div>
        <div v-if="loadingActivities" class="loading">
          <i class="fas fa-spinner fa-spin"></i> Loading activities...
        </div>
        <div v-else-if="recentActivities.length > 0" class="activity-list">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
            <div class="activity-type">
              <i class="fas" :class="getActivityIcon(activity)"></i>
              {{ formatActivityType(activity) }}
            </div>
            <div class="activity-details">
              {{ generateActivityText(activity) }}
            </div>
            <div class="activity-time">
              <i class="fas fa-clock"></i> {{ formatTime(activity.timestamp) }}
            </div>
            <div class="activity-status" :class="activity.status || 'update'">
              {{ formatStatus(activity.status) }}
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          <i class="fas fa-check-circle"></i>
          <p>No recent activities found</p>
        </div>
      </section>

      <section class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <router-link to="/police/assigned-incidents" class="action-card">
            <div class="action-icon">
              <i class="fas fa-clipboard-list"></i>
            </div>
            <span>My Incidents</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
          <router-link to="/police/patrol-map" class="action-card">
            <div class="action-icon">
              <i class="fas fa-map-marked-alt"></i>
            </div>
            <span>Patrol Map</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
          <router-link to="/police/incident-report" class="action-card">
            <div class="action-icon">
              <i class="fas fa-file-alt"></i>
            </div>
            <span>File Report</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
          <router-link to="/police/resources" class="action-card">
            <div class="action-icon">
              <i class="fas fa-tools"></i>
            </div>
            <span>Resources</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
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
    const lastUpdated = ref('Just now')
    const incidentTrend = ref(0)
    const pendingTrend = ref(0)
    const resolvedTrend = ref(0)

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

        // Calculate trends (mock data - replace with actual calculations)
        incidentTrend.value = Math.floor(Math.random() * 30) - 15
        pendingTrend.value = Math.floor(Math.random() * 20) - 10
        resolvedTrend.value = Math.floor(Math.random() * 25) - 5

        // Fetch recent activities
        await fetchRecentActivities(user.uid)

        // Update last updated time
        lastUpdated.value = new Date().toLocaleTimeString()
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
      return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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

    const formatStatus = (status) => {
      if (!status) return 'Update'
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    const getActivityIcon = (activity) => {
      if (activity.status === 'resolved') return 'fa-check-circle'
      if (activity.status === 'pending') return 'fa-hourglass-half'
      if (activity.status === 'critical') return 'fa-exclamation-triangle'
      return 'fa-file-alt'
    }

    const formatActivityType = (activity) => {
      if (activity.status === 'resolved') return 'Case Resolved'
      if (activity.status === 'pending') return 'Pending Action'
      return 'Incident Update'
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
      lastUpdated,
      incidentTrend,
      pendingTrend,
      resolvedTrend,
      formatTime,
      generateActivityText,
      formatStatus,
      getActivityIcon,
      formatActivityType,
      fetchPoliceData
    }
  }
}
</script>

<style scoped>
/* Base Styles */
.police-dashboard {
  padding: 20px;
  background-color: #aebfcf;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header Styles */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

h1 {
  color: #1a365d;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.refresh-btn {
  background-color: #2b6cb0;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  background-color: #2c5282;
  transform: translateY(-1px);
}

.refresh-btn i {
  font-size: 0.9rem;
}

.last-updated {
  font-size: 0.85rem;
  color: #4a5568;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, #2b6cb0, #38a169);
}

.stat-icon {
  font-size: 1.5rem;
  color: #2b6cb0;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #1a365d;
  margin-bottom: 5px;
}

.stat-label {
  color: #4a5568;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-trend {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
}

.stat-trend.up {
  background-color: #c6f6d5;
  color: #22543d;
}

.stat-trend.down {
  background-color: #fed7d7;
  color: #742a2a;
}

.stat-trend i {
  font-size: 0.7rem;
}

.stat-link {
  display: block;
  color: #2b6cb0;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: 5px;
  transition: color 0.2s ease;
}

.stat-link:hover {
  color: #1e4e8c;
  text-decoration: underline;
}

/* Dashboard Sections Layout */
.dashboard-sections {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

@media (min-width: 992px) {
  .dashboard-sections {
    grid-template-columns: 2fr 1fr;
  }
}

/* Section Common Styles */
.recent-activity, .quick-actions {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  color: #1a365d;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.view-all {
  color: #2b6cb0;
  font-size: 0.9rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.2s ease;
}

.view-all:hover {
  color: #1e4e8c;
}

.view-all i {
  font-size: 0.8rem;
}

/* Recent Activity Section */
.activity-list {
  margin-bottom: 20px;
}

.activity-item {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr auto;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #edf2f7;
  align-items: center;
  transition: background-color 0.2s ease;
}

.activity-item:hover {
  background-color: #f8fafc;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-type, .activity-details, .activity-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #1a365d;
}

.activity-type i {
  color: #2b6cb0;
  width: 20px;
  text-align: center;
}

.activity-time i {
  color: #4a5568;
  width: 20px;
  text-align: center;
}

.activity-status {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
}

.activity-status.resolved {
  background-color: #c6f6d5;
  color: #22543d;
}

.activity-status.pending {
  background-color: #feebc8;
  color: #7b341e;
}

.activity-status.update {
  background-color: #bee3f8;
  color: #2c5282;
}

.loading {
  text-align: center;
  padding: 40px 20px;
  color: #718096;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.loading i {
  font-size: 1.5rem;
  margin-bottom: 10px;
}

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #a0aec0;
  font-style: italic;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.no-data i {
  font-size: 2rem;
  color: #c6f6d5;
}

.no-data p {
  margin: 0;
  font-size: 1rem;
}

/* Quick Actions Section */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-decoration: none;
  color: #1a365d;
  transition: all 0.3s ease;
  height: 120px;
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  border-color: #2b6cb0;
}

.action-icon {
  font-size: 1.8rem;
  margin-bottom: 12px;
  color: #2b6cb0;
  transition: all 0.3s ease;
}

.action-card:hover .action-icon {
  transform: scale(1.1);
}

.action-card span {
  font-weight: 600;
  text-align: center;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.action-hover {
  position: absolute;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  background: #2b6cb0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: all 0.3s ease;
}

.action-card:hover .action-hover {
  right: 15px;
  opacity: 1;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .activity-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>