<template>
  <div class="system-settings">
    <h1>System Settings</h1>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading settings...</p>
    </div>

    <div v-else class="settings-form">
      <div class="form-section">
        <h2>General Settings</h2>
        <div class="form-group">
          <label for="appName">Application Name:</label>
          <input type="text" id="appName" v-model="settings.appName" @input="debouncedSaveSettings" />
          <p class="description">Name displayed across the application.</p>
        </div>

        <div class="form-group checkbox-group">
          <input type="checkbox" id="enableNotifications" v-model="settings.enableNotifications" @change="saveSettings" />
          <label for="enableNotifications">Enable Email Notifications</label>
          <p class="description">Receive email alerts for new incidents and updates.</p>
        </div>

        <div class="form-group">
          <label for="defaultIncidentUrgency">Default Incident Urgency:</label>
          <select id="defaultIncidentUrgency" v-model="settings.defaultIncidentUrgency" @change="saveSettings">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <p class="description">Set the default urgency for newly reported incidents.</p>
        </div>
      </div>

      <div class="form-section">
        <h2>Appearance</h2>
        <div class="form-group">
          <label for="theme">Application Theme:</label>
          <select id="theme" v-model="settings.theme" @change="saveSettings">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p class="description">Choose between light and dark mode.</p>
        </div>
      </div>

      <div class="form-section">
        <h2>Data Management</h2>
        <div class="form-group">
          <label for="dataRetentionDays">Incident Data Retention (Days):</label>
          <input type="number" id="dataRetentionDays" v-model.number="settings.dataRetentionDays" @input="debouncedSaveSettings" min="30" max="365" />
          <p class="description">Incidents older than this will be archived or deleted. (Min: 30, Max: 365)</p>
        </div>
      </div>

      <div v-if="saveStatus" :class="['save-status', { 'success': saveStatus === 'Saved!', 'error': saveStatus.includes('Error') }]">
        {{ saveStatus }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import { db } from '../../services/firebase'; // Adjust path as needed
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default {
  name: 'SystemSettings',
  setup() {
    const settings = ref({
      appName: 'Incident Manager',
      enableNotifications: true,
      defaultIncidentUrgency: 'medium',
      theme: 'light',
      dataRetentionDays: 90,
    });
    const loading = ref(true);
    const saveStatus = ref('');
    let saveTimeout = null;
    let debounceTimeout = null;

    // Fetch settings on component mount
    onMounted(async () => {
      try {
        const settingsRef = doc(db, 'system', 'appSettings'); // Using a fixed doc ID 'appSettings'
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          settings.value = { ...settings.value, ...docSnap.data() };
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        saveStatus.value = 'Error loading settings.';
      } finally {
        loading.value = false;
      }
    });

    // Clear debounce timeout on unmount
    onUnmounted(() => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    });

    // Function to save settings to Firebase
    const saveSettings = async () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveStatus.value = 'Saving...';
      try {
        const settingsRef = doc(db, 'system', 'appSettings');
        await setDoc(settingsRef, settings.value, { merge: true }); // Use merge to avoid overwriting other fields
        saveStatus.value = 'Saved!';
        saveTimeout = setTimeout(() => {
          saveStatus.value = '';
        }, 2000); // Clear status after 2 seconds
      } catch (error) {
        console.error('Error saving settings:', error);
        saveStatus.value = 'Error saving settings.';
        saveTimeout = setTimeout(() => {
          saveStatus.value = '';
        }, 3000); // Clear status after 3 seconds for errors
      }
    };

    // Debounced version of saveSettings for input fields
    const debouncedSaveSettings = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        saveSettings();
      }, 500); // Save 500ms after user stops typing
    };

    return {
      settings,
      loading,
      saveStatus,
      saveSettings,
      debouncedSaveSettings,
    };
  },
};
</script>

<style scoped>
.system-settings {
  max-width: 900px;
  margin: 20px auto;
  padding: 30px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 40px;
  font-size: 2.2em;
  font-weight: 700;
}

.loading-state {
  text-align: center;
  padding: 80px 20px;
  font-size: 1.1em;
  color: #555;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #42b983;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.form-section {
  background-color: #f8f9fa;
  padding: 25px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.form-section h2 {
  color: #34495e;
  margin-bottom: 25px;
  font-size: 1.6em;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
  font-size: 1em;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1em;
  color: #495057;
  transition: border-color 0.3s, box-shadow 0.3s;
  box-sizing: border-box; /* Ensures padding doesn't increase width */
}

.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.form-group select:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  outline: none;
}

.form-group.checkbox-group {
  display: flex;
  align-items: center;
  margin-top: 15px;
  margin-bottom: 20px;
}

.form-group.checkbox-group input[type="checkbox"] {
  width: auto; /* Override 100% width for checkboxes */
  margin-right: 10px;
  transform: scale(1.2); /* Make checkbox slightly larger */
}

.form-group.checkbox-group label {
  margin-bottom: 0;
  cursor: pointer;
}

.description {
  font-size: 0.9em;
  color: #6c757d;
  margin-top: 5px;
  line-height: 1.4;
}

.save-status {
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  margin-top: 25px;
  font-weight: 600;
  font-size: 1em;
  transition: opacity 0.3s ease-in-out;
  opacity: 1;
}

.save-status.success {
  background-color: #d4edda;
  color: #155724;
}

.save-status.error {
  background-color: #f8d7da;
  color: #721c24;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .system-settings {
    padding: 20px;
    margin: 15px;
  }

  h1 {
    font-size: 2em;
    margin-bottom: 30px;
  }

  .form-section h2 {
    font-size: 1.4em;
    margin-bottom: 20px;
  }
}

@media (max-width: 480px) {
  .system-settings {
    padding: 15px;
    margin: 10px;
  }

  h1 {
    font-size: 1.8em;
    margin-bottom: 25px;
  }

  .form-section h2 {
    font-size: 1.3em;
  }

  .form-group input,
  .form-group select {
    padding: 10px;
  }
}
</style>