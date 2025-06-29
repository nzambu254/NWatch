<template>
  <div class="admin-dashboard">
    <h1>Admin Dashboard</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ pendingIncidents }}</div>
        <div class="stat-label">Pending Incidents</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ activeAlerts }}</div>
        <div class="stat-label">Active Alerts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ registeredUsers }}</div>
        <div class="stat-label">Registered Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ responseTime }}</div>
        <div class="stat-label">Avg. Response Time</div>
      </div>
    </div>

    <div class="dashboard-sections">
      <section class="pending-actions">
        <h2>Pending Actions</h2>
        <div v-if="pendingItems.length > 0" class="pending-list">
          <div v-for="item in pendingItems" :key="item.id" class="pending-item">
            <div class="pending-type">{{ item.type }}</div>
            <div class="pending-details">{{ item.details }}</div>
            <div class="pending-time">{{ formatDate(item.timestamp) }}</div>
            <div class="pending-urgency" :class="'urgency-' + item.urgency">
              {{ item.urgency }}
            </div>
            <button class="action-btn" @click="handleAction(item)">
              {{ item.action }}
            </button>
          </div>
        </div>
        <div v-else class="no-data">
          No pending actions at this time
        </div>
      </section>

      <section class="quick-stats">
        <h2>Incident Statistics</h2>
        <div class="stats-chart">
          <canvas ref="statsChart"></canvas>
        </div>
        <div class="stat-notes">
          <div class="stat-note">
            <span class="note-color" style="background-color: #3498db;"></span>
            <span>Pending ({{ incidentStats.pending }})</span>
          </div>
          <div class="stat-note">
            <span class="note-color" style="background-color: #f39c12;"></span>
            <span>Investigating ({{ incidentStats.investigating }})</span>
          </div>
          <div class="stat-note">
            <span class="note-color" style="background-color: #2ecc71;"></span>
            <span>Resolved ({{ incidentStats.resolved }})</span>
          </div>
          <div class="stat-note">
            <span class="note-color" style="background-color: #e74c3c;"></span>
            <span>High Urgency ({{ incidentStats.highUrgency }})</span>
          </div>
        </div>
        
        <div class="incident-types-summary">
          <h3>Incident Types</h3>
          <div class="type-stats">
            <div v-for="(count, type) in incidentTypes" :key="type" class="type-stat">
              <span class="type-name">{{ formatIncidentType(type) }}</span>
              <span class="type-count">{{ count }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-actions">
        <h2>Quick Admin Actions</h2>
        <div class="actions-grid">
          <router-link to="/admin/manage-incidents" class="admin-action-card">
            <i class="fas fa-tasks"></i>
            <span>Manage Incidents</span>
          </router-link>
          <router-link to="/admin/broadcast-alerts" class="admin-action-card">
            <i class="fas fa-bullhorn"></i>
            <span>Broadcast Alert</span>
          </router-link>
          <router-link to="/admin/user-management" class="admin-action-card">
            <i class="fas fa-users"></i>
            <span>User Management</span>
          </router-link>
          <router-link to="/admin/neighborhood-map" class="admin-action-card">
            <i class="fas fa-map"></i>
            <span>Neighborhood Map</span>
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
import Chart from 'chart.js/auto'

export default {
  name: 'AdminDashboard',
  setup() {
    const pendingIncidents = ref(0)
    const activeAlerts = ref(0)
    const registeredUsers = ref(0)
    const responseTime = ref('2.5h')
    const pendingItems = ref([])
    const statsChart = ref(null)
    const incidentStats = ref({
      pending: 0,
      investigating: 0,
      resolved: 0,
      highUrgency: 0
    })
    const incidentTypes = ref({})

    const fetchData = async () => {
      try {
        // Fetch all incidents for comprehensive stats
        const allIncidentsQuery = query(collection(db, 'incidents'))
        const allIncidentsSnapshot = await getDocs(allIncidentsQuery)
        const allIncidents = allIncidentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Calculate incident statistics
        const stats = {
          pending: 0,
          investigating: 0,
          resolved: 0,
          highUrgency: 0
        }
        const types = {}

        allIncidents.forEach(incident => {
          // Count by status
          if (incident.status) {
            stats[incident.status] = (stats[incident.status] || 0) + 1
          }
          
          // Count high urgency incidents
          if (incident.urgency === 'high') {
            stats.highUrgency++
          }

          // Count by type
          if (incident.type) {
            types[incident.type] = (types[incident.type] || 0) + 1
          }
        })

        incidentStats.value = stats
        incidentTypes.value = types
        pendingIncidents.value = stats.pending || 0

        // Fetch pending incidents for pending actions section
        const pendingQuery = query(
          collection(db, 'incidents'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const pendingSnapshot = await getDocs(pendingQuery)
        
        pendingItems.value = pendingSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            type: 'Incident Review',
            details: `${data.title || 'Untitled'} - ${data.type || 'Unknown type'}`,
            timestamp: data.createdAt,
            urgency: data.urgency || 'medium',
            action: 'Review',
            incidentType: data.type,
            location: data.location
          }
        })

        // Fetch active alerts
        const alertsQuery = query(
          collection(db, 'broadcastAlerts'),
          where('active', '==', true)
        )
        const alertsSnapshot = await getDocs(alertsQuery)
        activeAlerts.value = alertsSnapshot.size

        // Fetch user count
        const usersQuery = query(collection(db, 'users'))
        const usersSnapshot = await getDocs(usersQuery)
        registeredUsers.value = usersSnapshot.size

        // Calculate average response time based on resolved incidents
        const resolvedIncidents = allIncidents.filter(incident => 
          incident.status === 'resolved' && incident.createdAt && incident.updatedAt
        )
        
        if (resolvedIncidents.length > 0) {
          const totalResponseTime = resolvedIncidents.reduce((total, incident) => {
            const created = incident.createdAt.toDate ? incident.createdAt.toDate() : new Date(incident.createdAt)
            const updated = incident.updatedAt.toDate ? incident.updatedAt.toDate() : new Date(incident.updatedAt)
            return total + (updated - created)
          }, 0)
          
          const avgResponseTimeMs = totalResponseTime / resolvedIncidents.length
          const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60)
          responseTime.value = `${avgResponseTimeHours.toFixed(1)}h`
        }

      } catch (error) {
        console.error('Error fetching admin dashboard data:', error)
      }
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleString()
    }

    const formatIncidentType = (type) => {
      return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    }

    const handleAction = (item) => {
      // Handle the action based on item type
      console.log(`Handling action for ${item.type}: ${item.id}`)
      // Route to incident management page with the specific incident
      // this.$router.push(`/admin/manage-incidents/${item.id}`)
    }

    const initializeChart = () => {
      if (statsChart.value) {
        const ctx = statsChart.value.getContext('2d')
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Pending', 'Investigating', 'Resolved', 'High Urgency'],
            datasets: [{
              data: [
                incidentStats.value.pending,
                incidentStats.value.investigating,
                incidentStats.value.resolved,
                incidentStats.value.highUrgency
              ],
              backgroundColor: [
                '#3498db',
                '#f39c12',
                '#2ecc71',
                '#e74c3c'
              ],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            }
          }
        })
      }
    }

    onMounted(async () => {
      await fetchData()
      
      // Initialize chart after data is loaded
      setTimeout(() => {
        initializeChart()
      }, 100)
    })

    return {
      pendingIncidents,
      activeAlerts,
      registeredUsers,
      responseTime,
      pendingItems,
      statsChart,
      incidentStats,
      incidentTypes,
      formatDate,
      formatIncidentType,
      handleAction
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
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

@media (min-width: 1200px) {
  .dashboard-sections {
    grid-template-columns: 2fr 1fr;
  }
}

.pending-actions, .quick-stats, .admin-actions {
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

h3 {
  color: #2c3e50;
  margin: 20px 0 15px 0;
  font-size: 1.1rem;
}

.pending-list {
  margin-bottom: 20px;
}

.pending-item {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr auto auto;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  align-items: center;
}

.pending-item:last-child {
  border-bottom: none;
}

.pending-type {
  font-weight: bold;
  color: #3498db;
}

.pending-details {
  color: #2c3e50;
}

.pending-time {
  font-size: 0.9rem;
  color: #95a5a6;
}

.pending-urgency {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.urgency-high {
  background-color: #e74c3c;
  color: white;
}

.urgency-medium {
  background-color: #f39c12;
  color: white;
}

.urgency-low {
  background-color: #2ecc71;
  color: white;
}

.action-btn {
  padding: 5px 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.3s;
}

.action-btn:hover {
  background-color: #2980b9;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #95a5a6;
  font-style: italic;
}

.stats-chart {
  height: 200px;
  margin-bottom: 20px;
}

.stat-notes {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.stat-note {
  display: flex;
  align-items: center;
  margin: 5px 10px;
  font-size: 0.9rem;
}

.note-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  margin-right: 8px;
}

.incident-types-summary {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.type-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
}

.type-name {
  color: #2c3e50;
  font-size: 0.9rem;
}

.type-count {
  background-color: #3498db;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}

.admin-actions {
  grid-column: 1 / -1;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.admin-action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 25px;
  text-decoration: none;
  color: #2c3e50;
  transition: all 0.3s ease;
  height: 120px;
}

.admin-action-card:hover {
  background: #e9ecef;
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.admin-action-card i {
  font-size: 2.5rem;
  margin-bottom: 15px;
  color: #3498db;
}

.admin-action-card span {
  font-weight: bold;
  text-align: center;
}
</style>