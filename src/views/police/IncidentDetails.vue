<template>
  <div class="incident-details-container">
    <div class="header">
      <router-link to="/police/assigned-incidents" class="back-button">
        <i class="fas fa-arrow-left"></i> Back to Incidents
      </router-link>
      <h1>Incident Details</h1>
    </div>

    <div v-if="loading" class="loading-state">
      <i class="fas fa-spinner fa-spin"></i> Loading incident details...
    </div>

    <div v-else-if="incident" class="incident-content">
      <div class="incident-card">
        <div class="incident-header">
          <span class="incident-id">Case #{{ incident.id }}</span>
          <span :class="['status-badge', `status-${incident.status}`]">
            {{ incident.status }}
          </span>
        </div>

        <div class="incident-body">
          <h2 class="incident-title">{{ incident.title }}</h2>
          <p class="incident-description">{{ incident.description }}</p>

          <div class="incident-meta">
            <div class="meta-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ incident.location }}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-calendar-alt"></i>
              <span>Reported: {{ formatDate(incident.reportedAt) }}</span>
            </div>
            <div v-if="incident.resolvedAt" class="meta-item">
              <i class="fas fa-check-circle"></i>
              <span>Resolved: {{ formatDate(incident.resolvedAt) }}</span>
            </div>
            <div class="meta-item">
              <i class="fas fa-user"></i>
              <span>Reporter: {{ incident.reporterName || 'Anonymous' }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button 
              v-if="incident.status !== 'resolved'"
              @click="resolveIncident"
              class="btn resolve-btn"
            >
              <i class="fas fa-check"></i> Mark as Resolved
            </button>
            <button 
              @click="openNoteModal"
              class="btn note-btn"
            >
              <i class="fas fa-plus"></i> Add Note
            </button>
          </div>
        </div>

        <div v-if="incident.notes && incident.notes.length" class="notes-section">
          <h3>Investigation Notes</h3>
          <div class="notes-list">
            <div v-for="(note, index) in sortedNotes" :key="index" class="note-card">
              <div class="note-header">
                <span class="note-author">{{ note.author }}</span>
                <span class="note-date">{{ formatDate(note.timestamp) }}</span>
              </div>
              <p class="note-content">{{ note.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="error-state">
      <i class="fas fa-exclamation-circle"></i> Incident not found
    </div>

    <!-- Add Note Modal -->
    <div v-if="showNoteModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Add Investigation Note</h3>
        <textarea 
          v-model="newNote" 
          placeholder="Enter your notes about this incident..."
          class="note-textarea"
        ></textarea>
        <div class="modal-actions">
          <button @click="showNoteModal = false" class="btn cancel-btn">
            Cancel
          </button>
          <button @click="addNote" class="btn submit-btn" :disabled="!newNote.trim()">
            Save Note
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, db } from '../../services/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'

export default {
  name: 'IncidentDetails',
  props: {
    id: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const route = useRoute()
    const router = useRouter()
    const incident = ref(null)
    const loading = ref(true)
    const showNoteModal = ref(false)
    const newNote = ref('')

    const fetchIncident = async () => {
      try {
        const incidentId = props.id || route.params.id
        const incidentDoc = await getDoc(doc(db, 'incidents', incidentId))
        
        if (incidentDoc.exists()) {
          incident.value = {
            id: incidentDoc.id,
            ...incidentDoc.data()
          }
        }
      } catch (error) {
        console.error('Error fetching incident:', error)
      } finally {
        loading.value = false
      }
    }

    const resolveIncident = async () => {
      try {
        await updateDoc(doc(db, 'incidents', incident.value.id), {
          status: 'resolved',
          resolvedAt: new Date()
        })
        incident.value.status = 'resolved'
        incident.value.resolvedAt = new Date()
      } catch (error) {
        console.error('Error resolving incident:', error)
        alert('Failed to resolve incident')
      }
    }

    const openNoteModal = () => {
      showNoteModal.value = true
      newNote.value = ''
    }

    const addNote = async () => {
      if (!newNote.value.trim()) return

      try {
        const note = {
          content: newNote.value.trim(),
          author: auth.currentUser?.email || 'Anonymous Officer',
          timestamp: new Date()
        }

        // Use arrayUnion to add the note to the notes array
        await updateDoc(doc(db, 'incidents', incident.value.id), {
          notes: arrayUnion(note)
        })

        // Update local state
        if (!incident.value.notes) {
          incident.value.notes = []
        }
        incident.value.notes.push(note)
        
        showNoteModal.value = false
      } catch (error) {
        console.error('Error adding note:', error)
        alert('Failed to add note. Please try again.')
      }
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return 'N/A'
      
      // Handle both Firestore Timestamp and JavaScript Date objects
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const sortedNotes = computed(() => {
      if (!incident.value?.notes) return []
      
      return [...incident.value.notes].sort((a, b) => {
        // Handle both Firestore Timestamp and JavaScript Date objects
        const dateA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)
        const dateB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)
        return dateB - dateA
      })
    })

    onMounted(() => {
      fetchIncident()
    })

    return {
      incident,
      loading,
      showNoteModal,
      newNote,
      sortedNotes,
      resolveIncident,
      openNoteModal,
      addNote,
      formatDate
    }
  }
}
</script>

<style scoped>
.incident-details-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
  position: relative;
}

.header h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
}

.back-button {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}

.back-button:hover {
  text-decoration: underline;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  font-size: 1.1rem;
}

.loading-state i,
.error-state i {
  margin-right: 10px;
}

.incident-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.incident-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.incident-id {
  font-weight: bold;
  color: #2c3e50;
}

.status-badge {
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-pending {
  background-color: #f39c12;
  color: white;
}

.status-investigating {
  background-color: #3498db;
  color: white;
}

.status-resolved {
  background-color: #2ecc71;
  color: white;
}

.incident-body {
  padding: 20px;
}

.incident-title {
  margin: 0 0 15px;
  color: #2c3e50;
  font-size: 1.4rem;
}

.incident-description {
  margin: 0 0 20px;
  color: #34495e;
  line-height: 1.6;
  white-space: pre-line;
}

.incident-meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin: 25px 0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #34495e;
  font-size: 0.9rem;
}

.meta-item i {
  color: #7f8c8d;
  width: 16px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn i {
  font-size: 0.9rem;
}

.resolve-btn {
  background-color: #2ecc71;
  color: white;
}

.resolve-btn:hover {
  background-color: #27ae60;
}

.note-btn {
  background-color: #3498db;
  color: white;
}

.note-btn:hover {
  background-color: #2980b9;
}

.notes-section {
  border-top: 1px solid #eee;
  padding: 20px;
}

.notes-section h3 {
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 1.2rem;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.note-card {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  border-left: 3px solid #3498db;
}

.note-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.note-author {
  font-weight: bold;
  color: #2c3e50;
}

.note-date {
  color: #7f8c8d;
}

.note-content {
  margin: 0;
  color: #34495e;
  line-height: 1.5;
  white-space: pre-line;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 25px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.note-textarea {
  width: 100%;
  min-height: 150px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 15px 0;
  font-family: inherit;
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn {
  background: #e0e0e0;
  color: #333;
}

.cancel-btn:hover {
  background: #d0d0d0;
}

.submit-btn {
  background: #3498db;
  color: white;
}

.submit-btn:hover {
  background: #2980b9;
}

.submit-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .incident-meta {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .modal-content {
    width: 95%;
    padding: 15px;
  }
}
</style>