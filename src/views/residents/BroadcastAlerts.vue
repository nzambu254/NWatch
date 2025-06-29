<template>
  <div class="broadcast-alerts">
    <div class="header">
      <h1>Community Alerts</h1>
      <p>Important notifications from local authorities</p>
    </div>

    <div class="alert-list">
      <div 
        v-for="alert in activeAlerts" 
        :key="alert.id"
        class="alert-item"
        :class="'severity-' + alert.severity"
      >
        <div class="alert-header">
          <span class="alert-title">{{ alert.title }}</span>
          <span class="alert-time">{{ formatTime(alert.createdAt) }}</span>
        </div>
        <div class="alert-message">{{ alert.message }}</div>
        <div v-if="alert.requiresAction" class="action-required">
          ⚠️ Immediate Action Required
        </div>
      </div>

      <div v-if="activeAlerts.length === 0" class="no-alerts">
        <p>No active alerts at this time</p>
      </div>
    </div>

    <div v-if="newAlert" class="new-alert-notification">
      <div class="notification-content">
        <h3>New Alert: {{ newAlert.title }}</h3>
        <p>{{ newAlert.message }}</p>
        <button @click="dismissNewAlert">Dismiss</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '@/services/firebase'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'

export default {
  name: 'ResidentBroadcastAlerts',
  setup() {
    const activeAlerts = ref([])
    const newAlert = ref(null)
    let unsubscribe = null

    const loadAlerts = () => {
      const q = query(
        collection(db, 'broadcastAlerts'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      )

      unsubscribe = onSnapshot(q, (snapshot) => {
        const alerts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Check if there's a new alert that wasn't in the previous list
        if (activeAlerts.value.length > 0 && alerts.length > 0) {
          const latestAlert = alerts[0]
          const isNewAlert = !activeAlerts.value.some(a => a.id === latestAlert.id)
          
          if (isNewAlert) {
            newAlert.value = latestAlert
            // Play notification sound
            playNotificationSound()
          }
        }

        activeAlerts.value = alerts
      })
    }

    const playNotificationSound = () => {
      const audio = new Audio('/notification-sound.mp3') // Add your sound file
      audio.play().catch(e => console.log('Audio play failed:', e))
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      const date = timestamp.toDate()
      return date.toLocaleString()
    }

    const dismissNewAlert = () => {
      newAlert.value = null
    }

    onMounted(() => {
      loadAlerts()
    })

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe()
      }
    })

    return {
      activeAlerts,
      newAlert,
      formatTime,
      dismissNewAlert
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
  color: #1976d2;
  margin-bottom: 5px;
}

.alert-list {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.alert-item {
  padding: 15px;
  margin-bottom: 15px;
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
  margin-bottom: 8px;
}

.action-required {
  color: #d32f2f;
  font-weight: bold;
  margin-top: 10px;
}

.no-alerts {
  text-align: center;
  padding: 20px;
  color: #666;
}

.new-alert-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  background: #d32f2f;
  color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.notification-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.notification-content button {
  background: white;
  color: #d32f2f;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  margin-top: 10px;
  cursor: pointer;
  font-weight: bold;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>