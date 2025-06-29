<template>
  <div class="incident-feed">
    <div class="feed-header">
      <h1>My Reported Incidents</h1>
      
      <!-- Success message -->
      <div v-if="showSuccessMessage" class="success-message">
        ✅ Incident reported successfully!
      </div>
      
      <!-- Filters and Search -->
      <div class="filters-section">
        <div class="search-filter">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search your incidents..."
            class="search-input"
          >
        </div>
        
        <div class="filter-controls">
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          
          <select v-model="typeFilter" class="filter-select">
            <option value="">All Types</option>
            <option value="theft">Theft</option>
            <option value="vandalism">Vandalism</option>
            <option value="suspicious_activity">Suspicious Activity</option>
            <option value="noise_complaint">Noise Complaint</option>
            <option value="parking_violation">Parking Violation</option>
            <option value="other">Other</option>
          </select>
          
          <select v-model="urgencyFilter" class="filter-select">
            <option value="">All Urgency</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading your incidents...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredIncidents.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No incidents found</h3>
      <p v-if="hasActiveFilters">Try adjusting your filters to see more incidents.</p>
      <p v-else>You haven't reported any incidents yet.</p>
      <router-link to="/report-incident" class="report-btn">
        Report an Incident
      </router-link>
    </div>

    <!-- Incidents list -->
    <div v-else class="incidents-list">
      <div 
        v-for="incident in filteredIncidents" 
        :key="incident.id"
        class="incident-card"
        :class="[
          'urgency-' + incident.urgency,
          'status-' + incident.status
        ]"
      >
        <div class="incident-header">
          <div class="incident-meta">
            <span class="incident-type">{{ formatIncidentType(incident.type) }}</span>
            <span class="incident-date">{{ formatDate(incident.datetime) }}</span>
          </div>
          <div class="incident-badges">
            <span :class="'urgency-badge urgency-' + incident.urgency">
              {{ incident.urgency.toUpperCase() }}
            </span>
            <span :class="'status-badge status-' + incident.status">
              {{ formatStatus(incident.status) }}
            </span>
          </div>
        </div>

        <div class="incident-content">
          <h3 class="incident-title">{{ incident.title }}</h3>
          <p class="incident-description">{{ incident.description }}</p>
          
          <div class="incident-details">
            <div class="detail-item">
              <span class="detail-label">📍 Location:</span>
              <span class="detail-value">{{ incident.location }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">🕒 Time:</span>
              <span class="detail-value">{{ formatDateTime(incident.datetime) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">📊 Status:</span>
              <span class="detail-value">{{ formatStatus(incident.status) }}</span>
            </div>
          </div>

          <!-- Evidence section -->
          <div v-if="incident.evidenceUrls && incident.evidenceUrls.length > 0" class="evidence-section">
            <h4>Evidence:</h4>
            <div class="evidence-grid">
              <div 
                v-for="(url, index) in incident.evidenceUrls" 
                :key="index"
                class="evidence-item"
              >
                <img 
                  :src="url" 
                  :alt="'Evidence ' + (index + 1)"
                  @click="openLightbox(url)"
                  class="evidence-thumbnail"
                >
              </div>
            </div>
          </div>

          <!-- Status updates -->
          <div v-if="incident.statusUpdates && incident.statusUpdates.length > 0" class="status-updates">
            <h4>Status Updates:</h4>
            <div class="updates-list">
              <div 
                v-for="(update, index) in incident.statusUpdates" 
                :key="index"
                class="update-item"
              >
                <div class="update-date">{{ formatDateTime(update.timestamp) }}</div>
                <div class="update-text">{{ update.message }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox for evidence viewing -->
    <div v-if="lightboxImage" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <img :src="lightboxImage" alt="Evidence" class="lightbox-image">
        <button @click="closeLightbox" class="lightbox-close">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, db } from '../../services/firebase'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where 
} from 'firebase/firestore'

export default {
  name: 'IncidentFeed',
  setup() {
    const route = useRoute()
    const router = useRouter()
    
    // Reactive data
    const incidents = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const typeFilter = ref('')
    const urgencyFilter = ref('')
    const lightboxImage = ref(null)
    const showSuccessMessage = ref(false)
    
    // Show success message if redirected from report
    onMounted(() => {
      if (route.query.reported === 'true') {
        showSuccessMessage.value = true
        setTimeout(() => {
          showSuccessMessage.value = false
          router.replace({ query: {} })
        }, 5000)
      }
      
      loadUserIncidents()
    })

    // Cleanup on unmount
    onUnmounted(() => {
      // Any cleanup if needed
    })

    // Load only current user's incidents from Firestore
    const loadUserIncidents = () => {
      if (!auth.currentUser) {
        router.push('/login')
        return
      }

      const incidentsQuery = query(
        collection(db, 'incidents'),
        where('reportedBy', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      )

      onSnapshot(incidentsQuery, (snapshot) => {
        incidents.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        loading.value = false
      }, (error) => {
        console.error('Error loading incidents:', error)
        loading.value = false
      })
    }

    // Computed properties for filtering
    const hasActiveFilters = computed(() => {
      return searchQuery.value || statusFilter.value || typeFilter.value || urgencyFilter.value
    })

    const filteredIncidents = computed(() => {
      let filtered = incidents.value

      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(incident => 
          incident.title.toLowerCase().includes(query) ||
          incident.description.toLowerCase().includes(query) ||
          incident.location.toLowerCase().includes(query)
        )
      }

      // Status filter
      if (statusFilter.value) {
        filtered = filtered.filter(incident => incident.status === statusFilter.value)
      }

      // Type filter
      if (typeFilter.value) {
        filtered = filtered.filter(incident => incident.type === typeFilter.value)
      }

      // Urgency filter
      if (urgencyFilter.value) {
        filtered = filtered.filter(incident => incident.urgency === urgencyFilter.value)
      }

      return filtered
    })

    // Utility functions
    const formatIncidentType = (type) => {
      return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatStatus = (status) => {
      return status.replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatDate = (datetime) => {
      if (!datetime) return 'N/A'
      const date = datetime.toDate ? datetime.toDate() : new Date(datetime)
      return date.toLocaleDateString()
    }

    const formatDateTime = (datetime) => {
      if (!datetime) return 'N/A'
      const date = datetime.toDate ? datetime.toDate() : new Date(datetime)
      return date.toLocaleString()
    }

    // Lightbox functions
    const openLightbox = (imageUrl) => {
      lightboxImage.value = imageUrl
    }

    const closeLightbox = () => {
      lightboxImage.value = null
    }

    return {
      incidents,
      loading,
      searchQuery,
      statusFilter,
      typeFilter,
      urgencyFilter,
      lightboxImage,
      showSuccessMessage,
      hasActiveFilters,
      filteredIncidents,
      formatIncidentType,
      formatStatus,
      formatDate,
      formatDateTime,
      openLightbox,
      closeLightbox
    }
  }
}
</script>

<style scoped>
.incident-feed {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.feed-header {
  margin-bottom: 30px;
}

.feed-header h1 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 12px 20px;
  border-radius: 5px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 600;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.search-filter {
  margin-bottom: 15px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.filter-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  min-width: 150px;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.empty-state p {
  color: #7f8c8d;
  margin-bottom: 20px;
}

.report-btn {
  display: inline-block;
  padding: 12px 24px;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: 600;
  transition: background-color 0.3s;
}

.report-btn:hover {
  background-color: #369f6e;
}

.incidents-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.incident-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border-left: 5px solid #ddd;
  transition: transform 0.2s, box-shadow 0.2s;
}

.incident-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.incident-card.urgency-low {
  border-left-color: #28a745;
}

.incident-card.urgency-medium {
  border-left-color: #ffc107;
}

.incident-card.urgency-high {
  border-left-color: #dc3545;
}

.incident-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
  flex-wrap: wrap;
  gap: 10px;
}

.incident-meta {
  display: flex;
  gap: 15px;
  align-items: center;
}

.incident-type {
  font-weight: 600;
  color: #2c3e50;
  font-size: 16px;
}

.incident-date {
  color: #7f8c8d;
  font-size: 14px;
}

.incident-badges {
  display: flex;
  gap: 8px;
}

.urgency-badge, .status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.urgency-low {
  background-color: #d4edda;
  color: #155724;
}

.urgency-medium {
  background-color: #fff3cd;
  color: #856404;
}

.urgency-high {
  background-color: #f8d7da;
  color: #721c24;
}

.status-pending {
  background-color: #e2e3e5;
  color: #495057;
}

.status-investigating {
  background-color: #cce5ff;
  color: #004085;
}

.status-resolved {
  background-color: #d4edda;
  color: #155724;
}

.status-closed {
  background-color: #f8d7da;
  color: #721c24;
}

.incident-content {
  padding: 20px;
}

.incident-title {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 18px;
}

.incident-description {
  color: #555;
  line-height: 1.6;
  margin-bottom: 20px;
}

.incident-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-weight: 600;
  min-width: 80px;
}

.detail-value {
  color: #555;
}

.evidence-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.evidence-section h4 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.evidence-thumbnail {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 5px;
  cursor: pointer;
  transition: transform 0.2s;
}

.evidence-thumbnail:hover {
  transform: scale(1.05);
}

.status-updates {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.status-updates h4 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.update-item {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 5px;
  border-left: 3px solid #42b983;
}

.update-date {
  font-size: 12px;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.update-text {
  color: #555;
  font-size: 14px;
}

.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.lightbox-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.lightbox-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 5px;
}

.lightbox-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 30px;
  cursor: pointer;
  padding: 5px;
}

@media (max-width: 768px) {
  .filter-controls {
    flex-direction: column;
  }
  
  .filter-select {
    min-width: 100%;
  }
  
  .incident-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>