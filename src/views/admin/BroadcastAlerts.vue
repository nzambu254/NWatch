<template>
  <div class="broadcast-alerts">
    <div class="header">
      <h1>Emergency Broadcast System</h1>
      <p>Send urgent alerts to all residents</p>
    </div>

    <div class="alert-form">
      <div class="form-group">
        <label for="alert-title">Alert Title</label>
        <input 
          type="text" 
          id="alert-title" 
          v-model="alert.title" 
          placeholder="Critical Alert: Bandits raid"
          required
        >
      </div>

      <div class="form-group">
        <label for="alert-message">Message</label>
        <textarea 
          id="alert-message" 
          v-model="alert.message" 
          placeholder="Immediate evacuation required in Zone 3..."
          rows="4"
          required
        ></textarea>
      </div>

      <div class="form-group">
        <label>Alert Level</label>
        <div class="severity-options">
          <button 
            v-for="level in severityLevels" 
            :key="level.value"
            @click="alert.severity = level.value"
            :class="{ active: alert.severity === level.value }"
          >
            {{ level.label }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="alert.requiresAction">
          Requires Immediate Action
        </label>
      </div>

      <div class="action-buttons">
        <button @click="sendAlert" :disabled="!isFormValid" class="send-btn">
          🚨 Broadcast Alert
        </button>
        <button @click="resetForm" class="cancel-btn">
          Clear
        </button>
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <div class="recent-alerts" v-if="recentAlerts.length > 0">
      <h3>Recently Sent Alerts</h3>
      <div class="alert-list">
        <div 
          v-for="item in recentAlerts" 
          :key="item.id"
          class="alert-item"
          :class="'severity-' + item.severity"
        >
          <div class="alert-header">
            <span class="alert-title">{{ item.title }}</span>
            <span class="alert-time">{{ formatTime(item.createdAt) }}</span>
          </div>
          <div class="alert-message">{{ item.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { db } from '@/services/firebase'
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore'

export default {
  name: 'AdminBroadcastAlerts',
  setup() {
    const alert = ref({
      title: '',
      message: '',
      severity: 'high',
      requiresAction: false
    })

    const recentAlerts = ref([])
    const successMessage = ref('')
    const errorMessage = ref('')

    const severityLevels = [
      { value: 'high', label: 'High (Critical)' },
      { value: 'medium', label: 'Medium (Warning)' },
      { value: 'low', label: 'Low (Informational)' }
    ]

    const isFormValid = computed(() => {
      return alert.value.title.trim() !== '' && 
             alert.value.message.trim() !== ''
    })

    const sendAlert = async () => {
      try {
        const alertsRef = collection(db, 'broadcastAlerts')
        await addDoc(alertsRef, {
          ...alert.value,
          createdAt: serverTimestamp(),
          status: 'active',
          sender: 'Admin'
        })

        successMessage.value = 'Alert broadcasted successfully!'
        errorMessage.value = ''
        setTimeout(() => successMessage.value = '', 3000)
        resetForm()
      } catch (error) {
        console.error('Error sending alert:', error)
        errorMessage.value = 'Failed to send alert. Please try again.'
        setTimeout(() => errorMessage.value = '', 3000)
      }
    }

    const resetForm = () => {
      alert.value = {
        title: '',
        message: '',
        severity: 'high',
        requiresAction: false
      }
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate()
      return date.toLocaleString()
    }

    const loadRecentAlerts = () => {
      const q = query(
        collection(db, 'broadcastAlerts'),
        orderBy('createdAt', 'desc'),
        limit(5)
      )

      onSnapshot(q, (snapshot) => {
        recentAlerts.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      })
    }

    onMounted(() => {
      loadRecentAlerts()
    })

    return {
      alert,
      recentAlerts,
      severityLevels,
      isFormValid,
      successMessage,
      errorMessage,
      sendAlert,
      resetForm,
      formatTime
    }
  }
}
</script>

<style scoped>
.broadcast-alerts {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
  text-align: center;
}

.header h1 {
  color: #d32f2f;
  margin-bottom: 5px;
}

.alert-form {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.severity-options {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.severity-options button {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.severity-options button.active {
  font-weight: bold;
}

.severity-options button:nth-child(1).active {
  background: #ffcdd2;
  border-color: #d32f2f;
  color: #d32f2f;
}

.severity-options button:nth-child(2).active {
  background: #ffe0b2;
  border-color: #f57c00;
  color: #f57c00;
}

.severity-options button:nth-child(3).active {
  background: #c8e6c9;
  border-color: #388e3c;
  color: #388e3c;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.action-buttons button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.send-btn {
  background: #d32f2f;
  color: white;
}

.send-btn:disabled {
  background: #e0e0e0;
  cursor: not-allowed;
}

.cancel-btn {
  background: #f5f5f5;
}

.success-message {
  margin-top: 15px;
  padding: 10px;
  background: #c8e6c9;
  color: #388e3c;
  border-radius: 4px;
  text-align: center;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background: #ffcdd2;
  color: #d32f2f;
  border-radius: 4px;
  text-align: center;
}

.recent-alerts {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.recent-alerts h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  padding: 15px;
  border-radius: 4px;
  border-left: 4px solid #ddd;
}

.alert-item.severity-high {
  border-left-color: #d32f2f;
  background: #ffebee;
}

.alert-item.severity-medium {
  border-left-color: #f57c00;
  background: #fff3e0;
}

.alert-item.severity-low {
  border-left-color: #388e3c;
  background: #e8f5e9;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.alert-title {
  font-weight: bold;
}

.alert-time {
  color: #666;
  font-size: 0.9em;
}

.alert-message {
  color: #333;
}
</style>