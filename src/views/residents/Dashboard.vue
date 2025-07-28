<template>
  <div class="resident-dashboard">
    <div class="dashboard-header">
      <h1>Resident Dashboard</h1>
      <div class="header-actions">
        <button class="refresh-btn" @click="fetchData">
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
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <div class="stat-value">{{ incidentCount }}</div>
        <div class="stat-label">Reported Incidents</div>
        <div class="stat-trend" :class="incidentTrend >= 0 ? 'up' : 'down'">
          <i class="fas" :class="incidentTrend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
          {{ Math.abs(incidentTrend) }}% from last week
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-bell"></i>
        </div>
        <div class="stat-value">{{ alertsCount }}</div>
        <div class="stat-label">New Alerts</div>
        <div class="stat-trend" :class="alertTrend >= 0 ? 'up' : 'down'">
          <i class="fas" :class="alertTrend >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
          {{ Math.abs(alertTrend) }}% from last week
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-shield-alt"></i>
        </div>
        <div class="stat-value">{{ neighborhoodSafetyRating }}</div>
        <div class="stat-label">Safety Rating</div>
        <div class="rating-change" :class="ratingChange >= 0 ? 'up' : 'down'">
          <i class="fas" :class="ratingChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'"></i>
          {{ Math.abs(ratingChange) }} points
        </div>
      </div>
    </div>

    <div class="dashboard-sections">
      <section class="recent-incidents">
        <div class="section-header">
          <h2>Recent Incidents</h2>
          <router-link to="/incident-feed" class="view-all">
            View All <i class="fas fa-chevron-right"></i>
          </router-link>
        </div>
        <div v-if="recentIncidents.length > 0" class="incidents-list">
          <div v-for="incident in recentIncidents" :key="incident.id" class="incident-item">
            <div class="incident-type">
              <i class="fas" :class="getIncidentIcon(incident.type)"></i>
              {{ formatIncidentType(incident.type) }}
            </div>
            <div class="incident-location">
              <i class="fas fa-map-marker-alt"></i> {{ incident.location }}
            </div>
            <div class="incident-time">
              <i class="fas fa-clock"></i> {{ formatDate(incident.timestamp) }}
            </div>
            <div class="incident-status" :class="incident.status">
              {{ formatStatus(incident.status) }}
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          <i class="fas fa-check-circle"></i>
          <p>No recent incidents to display</p>
        </div>
      </section>

      <section class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <router-link to="/report-incident" class="action-card">
            <div class="action-icon">
              <i class="fas fa-edit"></i>
            </div>
            <span>Report Incident</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
          <router-link to="/neighborhood-map" class="action-card">
            <div class="action-icon">
              <i class="fas fa-map-marked-alt"></i>
            </div>
            <span>View Map</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
          <router-link to="/broadcast-alerts" class="action-card">
            <div class="action-icon">
              <i class="fas fa-bell"></i>
            </div>
            <span>View Alerts</span>
            <div class="action-hover">
              <i class="fas fa-arrow-right"></i>
            </div>
          </router-link>
          <router-link to="/incident-feed" class="action-card">
            <div class="action-icon">
              <i class="fas fa-list-ul"></i>
            </div>
            <span>Incident Feed</span>
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
import { db } from '../../services/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

export default {
  name: 'ResidentDashboard',
  setup() {
    const incidentCount = ref(0)
    const alertsCount = ref(0)
    const neighborhoodSafetyRating = ref('B+')
    const recentIncidents = ref([])
    const lastUpdated = ref('Just now')
    const incidentTrend = ref(0)
    const alertTrend = ref(0)
    const ratingChange = ref(0)

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

        // Calculate trends (mock data - replace with actual calculations)
        incidentTrend.value = Math.floor(Math.random() * 30) - 15
        alertTrend.value = Math.floor(Math.random() * 30) - 15
        ratingChange.value = Math.floor(Math.random() * 5) - 2

        // Update last updated time
        lastUpdated.value = new Date().toLocaleTimeString()

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const formatStatus = (status) => {
      return status.charAt(0).toUpperCase() + status.slice(1)
    }

    const formatIncidentType = (type) => {
      if (!type) return 'Unknown'
      return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }

    const getIncidentIcon = (type) => {
      const icons = {
        theft: 'fa-lock',
        vandalism: 'fa-spray-can',
        suspicious_activity: 'fa-user-secret',
        noise_complaint: 'fa-volume-up',
        emergency: 'fa-ambulance',
        default: 'fa-exclamation-triangle'
      }
      
      if (!type) return icons.default
      const key = type.toLowerCase().replace(' ', '_')
      return icons[key] || icons.default
    }

    onMounted(() => {
      fetchData()
    })

    return {
      incidentCount,
      alertsCount,
      neighborhoodSafetyRating,
      recentIncidents,
      lastUpdated,
      incidentTrend,
      alertTrend,
      ratingChange,
      formatDate,
      formatStatus,
      formatIncidentType,
      getIncidentIcon,
      fetchData
    }
  }
}
</script>

<style scoped>
/* Base Styles */
.resident-dashboard {
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
  color: #1e293b;
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
  background-color: #3b82f6;
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
  background-color: #2563eb;
  transform: translateY(-1px);
}

.refresh-btn i {
  font-size: 0.9rem;
}

.last-updated {
  font-size: 0.85rem;
  color: #64748b;
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
  background: linear-gradient(to bottom, #3b82f6, #10b981);
}

.stat-icon {
  font-size: 1.5rem;
  color: #3b82f6;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2.2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 5px;
}

.stat-label {
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-trend, .rating-change {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stat-trend.up, .rating-change.up {
  background-color: #dcfce7;
  color: #16a34a;
}

.stat-trend.down, .rating-change.down {
  background-color: #fee2e2;
  color: #dc2626;
}

.stat-trend i, .rating-change i {
  font-size: 0.7rem;
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
.recent-incidents, .quick-actions {
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
  color: #1e293b;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.view-all {
  color: #3b82f6;
  font-size: 0.9rem;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.2s ease;
}

.view-all:hover {
  color: #2563eb;
}

.view-all i {
  font-size: 0.8rem;
}

/* Recent Incidents Section */
.incidents-list {
  margin-bottom: 20px;
}

.incident-item {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 1fr auto;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
  transition: background-color 0.2s ease;
}

.incident-item:hover {
  background-color: #f8fafc;
}

.incident-item:last-child {
  border-bottom: none;
}

.incident-type, .incident-location, .incident-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #1e293b;
}

.incident-type i {
  color: #3b82f6;
  width: 20px;
  text-align: center;
}

.incident-location i {
  color: #ef4444;
  width: 20px;
  text-align: center;
}

.incident-time i {
  color: #64748b;
  width: 20px;
  text-align: center;
}

.incident-status {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
}

.incident-status.resolved {
  background-color: #dcfce7;
  color: #16a34a;
}

.incident-status.pending {
  background-color: #fef9c3;
  color: #a16207;
}

.incident-status.critical {
  background-color: #fee2e2;
  color: #dc2626;
}

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  font-style: italic;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.no-data i {
  font-size: 2rem;
  color: #bbf7d0;
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
  color: #1e293b;
  transition: all 0.3s ease;
  height: 120px;
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.action-icon {
  font-size: 1.8rem;
  margin-bottom: 12px;
  color: #3b82f6;
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
  background: #3b82f6;
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
  
  .incident-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>