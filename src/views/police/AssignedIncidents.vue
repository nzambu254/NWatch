<template>
  <div class="assigned-incidents">
    <div class="header">
      <h1>Assigned Incidents</h1>
      <div class="filters">
        <button 
          @click="setFilter('all')" 
          :class="{ active: currentFilter === 'all' }"
        >
          All Incidents
        </button>
        <button 
          @click="setFilter('pending')" 
          :class="{ active: currentFilter === 'pending' }"
        >
          Pending
        </button>
        <button 
          @click="setFilter('resolved')" 
          :class="{ active: currentFilter === 'resolved' }"
        >
          Resolved
        </button>
      </div>
    </div>
    
    <div class="incidents-list">
      <div v-if="loading" class="loading">Loading incidents...</div>
      
      <div v-else-if="incidents.length === 0" class="no-incidents">
        No incidents found matching your criteria.
      </div>
      
      <div v-else>
        <div 
          v-for="incident in incidents" 
          :key="incident.id" 
          class="incident-card"
          @click="viewIncidentDetails(incident.id)"
        >
          <div class="incident-header">
            <span class="incident-id">#{{ incident.id }}</span>
            <span 
              class="incident-status"
              :class="{
                'status-pending': incident.status === 'pending',
                'status-resolved': incident.status === 'resolved'
              }"
            >
              {{ incident.status }}
            </span>
          </div>
          <h3 class="incident-title">{{ incident.title }}</h3>
          <p class="incident-description">{{ incident.description }}</p>
          <div class="incident-footer">
            <span class="incident-date">{{ formatDate(incident.reportedAt) }}</span>
            <span class="incident-location">{{ incident.location }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { auth, db } from '../../services/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useRouter } from 'vue-router'

export default {
  name: 'AssignedIncidents',
  setup() {
    const incidents = ref([])
    const loading = ref(true)
    const currentFilter = ref('all')
    const router = useRouter()

    const fetchIncidents = async () => {
      try {
        loading.value = true
        const user = auth.currentUser
        if (!user) return

        let q
        const baseQuery = query(
          collection(db, 'incidents'),
          where('assignedOfficerId', '==', user.uid)
        )

        if (currentFilter.value === 'all') {
          q = baseQuery
        } else {
          q = query(baseQuery, where('status', '==', currentFilter.value))
        }

        const querySnapshot = await getDocs(q)
        incidents.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error fetching assigned incidents:', error)
      } finally {
        loading.value = false
      }
    }

    const setFilter = (filter) => {
      currentFilter.value = filter
      fetchIncidents()
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate()
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    }

    const viewIncidentDetails = (incidentId) => {
      router.push(`/police/incident-details/${incidentId}`)
    }

    onMounted(() => {
      fetchIncidents()
    })

    return {
      incidents,
      loading,
      currentFilter,
      setFilter,
      formatDate,
      viewIncidentDetails
    }
  }
}
</script>

<style scoped>
.assigned-incidents {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.filters button {
  padding: 8px 16px;
  margin-left: 10px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
}

.filters button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.incidents-list {
  margin-top: 20px;
}

.loading, .no-incidents {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.incident-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.incident-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.incident-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.incident-id {
  font-weight: bold;
  color: #2c3e50;
}

.incident-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-pending {
  background: #f39c12;
  color: white;
}

.status-resolved {
  background: #2ecc71;
  color: white;
}

.incident-title {
  margin: 0 0 10px;
  color: #2c3e50;
}

.incident-description {
  margin: 0 0 15px;
  color: #7f8c8d;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.incident-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #95a5a6;
}
</style>