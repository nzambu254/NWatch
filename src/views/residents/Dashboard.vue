<template>
  <div class="resident-dashboard">
    <h1>Resident Dashboard</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ incidentCount }}</div>
        <div class="stat-label">Reported Incidents</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ alertsCount }}</div>
        <div class="stat-label">New Alerts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ neighborhoodSafetyRating }}</div>
        <div class="stat-label">Safety Rating</div>
      </div>
    </div>

    <div class="dashboard-sections">
      <section class="recent-incidents">
        <h2>Recent Incidents</h2>
        <div v-if="recentIncidents.length > 0" class="incidents-list">
          <div v-for="incident in recentIncidents" :key="incident.id" class="incident-item">
            <div class="incident-type">{{ incident.type }}</div>
            <div class="incident-location">{{ incident.location }}</div>
            <div class="incident-time">{{ formatDate(incident.timestamp) }}</div>
            <div class="incident-status" :class="incident.status">{{ incident.status }}</div>
          </div>
        </div>
        <div v-else class="no-data">
          No recent incidents to display
        </div>
        <router-link to="/incident-feed" class="view-all">View All Incidents</router-link>
      </section>

      <section class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <router-link to="/report-incident" class="action-card">
            <i class="fas fa-edit"></i>
            <span>Report Incident</span>
          </router-link>
          <router-link to="/neighborhood-map" class="action-card">
            <i class="fas fa-map"></i>
            <span>View Map</span>
          </router-link>
          <router-link to="/broadcast-alerts" class="action-card">
            <i class="fas fa-bell"></i>
            <span>View Alerts</span>
          </router-link>
          <router-link to="/incident-feed" class="action-card">
            <i class="fas fa-list"></i>
            <span>Incident Feed</span>
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { db } from '../../services/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

export default {
  name: 'ResidentDashboard',
  setup() {
    const incidentCount = ref(0)
    const alertsCount = ref(0)
    const neighborhoodSafetyRating = ref('B+')
    const recentIncidents = ref([])

    const fetchData = async () => {
      try {
        // Fetch incident count
        const incidentsQuery = query(collection(db, 'incidents'))
        const incidentSnapshot = await getDocs(incidentsQuery)
        incidentCount.value = incidentSnapshot.size

        // Fetch recent incidents
        const recentQuery = query(
          collection(db, 'incidents'),
          orderBy('timestamp', 'desc'),
          limit(5)
        )
        const recentSnapshot = await getDocs(recentQuery)
        recentIncidents.value = recentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Fetch alerts count (last 7 days)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        
        const alertsQuery = query(
          collection(db, 'alerts'),
          where('timestamp', '>=', weekAgo)
        )
        const alertsSnapshot = await getDocs(alertsQuery)
        alertsCount.value = alertsSnapshot.size

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate()
      return date.toLocaleString()
    }

    onMounted(() => {
      fetchData()
    })

    return {
      incidentCount,
      alertsCount,
      neighborhoodSafetyRating,
      recentIncidents,
      formatDate
    }
  }
}
</script>

<style scoped>
.resident-dashboard {
  padding: 20px;
}

h1 {
  color: #2c3e50;
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #3498db;
  margin-bottom: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 1rem;
}

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

.recent-incidents, .quick-actions {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.3rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.incidents-list {
  margin-bottom: 20px;
}

.incident-item {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;
}

.incident-item:last-child {
  border-bottom: none;
}

.incident-type {
  font-weight: bold;
}

.incident-location {
  color: #7f8c8d;
}

.incident-time {
  font-size: 0.9rem;
  color: #95a5a6;
}

.incident-status {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  text-align: center;
}

.incident-status.resolved {
  background-color: #d4edda;
  color: #155724;
}

.incident-status.pending {
  background-color: #fff3cd;
  color: #856404;
}

.incident-status.critical {
  background-color: #f8d7da;
  color: #721c24;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #95a5a6;
  font-style: italic;
}

.view-all {
  display: block;
  text-align: right;
  color: #3498db;
  text-decoration: none;
  margin-top: 10px;
}

.view-all:hover {
  text-decoration: underline;
}

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
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  text-decoration: none;
  color: #2c3e50;
  transition: all 0.3s ease;
  height: 100px;
}

.action-card:hover {
  background: #e9ecef;
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-card i {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #3498db;
}

.action-card span {
  font-weight: bold;
  text-align: center;
}
</style>