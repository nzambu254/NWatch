<template>
  <div class="auth-page">
    <div class="auth-container">
      <h1>Register for NWatch</h1>
      <form @submit.prevent="register">
        <div class="form-group">
          <label for="firstName">First Name</label>
          <input type="text" id="firstName" v-model="firstName" required>
        </div>
        <div class="form-group">
          <label for="lastName">Last Name</label>
          <input type="text" id="lastName" v-model="lastName" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required>
        </div>
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" v-model="phone" required>
        </div>
        <div class="form-group" v-if="role === 'resident'">
          <label for="location">Resident Location (e.g., Estate Name, House No.)</label>
          <input type="text" id="location" v-model="location" :required="role === 'resident'">
        </div>
        <div class="form-group" v-if="role === 'police'">
          <label for="badgeNumber">Badge Number</label>
          <input type="text" id="badgeNumber" v-model="badgeNumber" :required="role === 'police'">
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required>
        </div>
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input type="password" id="confirmPassword" v-model="confirmPassword" required>
        </div>
        <div class="form-group">
          <label for="role">Role</label>
          <select id="role" v-model="role" class="form-select" required>
            <option value="" disabled>Select your role</option>
            <option value="resident">Resident</option>
            <option value="police">Police Officer (Requires approval)</option>
            <option value="admin">Admin (Requires approval)</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
      </form>
      <p class="auth-footer">
        Already have an account? <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { auth, db } from '../../services/firebase'
import { useRouter } from 'vue-router'
import { doc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'

export default {
  name: 'Register',
  setup() {
    const firstName = ref('')
    const lastName = ref('')
    const email = ref('')
    const phone = ref('')
    const location = ref('')
    const badgeNumber = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const role = ref('resident')
    const loading = ref(false)
    const router = useRouter()

    const register = async () => {
      if (password.value !== confirmPassword.value) {
        alert("Passwords don't match")
        return
      }

      // Validate location for residents
      if (role.value === 'resident' && !location.value.trim()) {
        alert('Please enter your resident location.')
        return
      }

      // Validate badge number for police
      if (role.value === 'police' && !badgeNumber.value.trim()) {
        alert('Please enter your badge number.')
        return
      }

      loading.value = true

      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.value,
          password.value
        )
        const user = userCredential.user

        // Prepare user data for Firestore
        const userData = {
          firstName: firstName.value,
          lastName: lastName.value,
          email: email.value,
          phone: phone.value,
          role: role.value,
          approved: role.value === 'resident', // Auto-approve residents only
          createdAt: new Date(),
          // Role-specific fields
          ...(role.value === 'resident' && { location: location.value }),
          ...(role.value === 'police' && { badgeNumber: badgeNumber.value })
        };

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), userData);

        // Redirect based on role
        if (role.value === 'admin' || role.value === 'police') {
          alert('Your account requires approval. You will be notified once approved.')
          router.push('/login')
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Registration error:', error.message);
        alert(`Registration failed: ${error.message}`);
      } finally {
        loading.value = false
      }
    }

    return { 
      firstName, 
      lastName, 
      email, 
      phone, 
      location,
      badgeNumber,
      password, 
      confirmPassword, 
      role, 
      loading,
      register 
    }
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.auth-container {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
}

.auth-container h1 {
  text-align: center;
  margin-bottom: 25px;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #2c3e50;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #42b983;
  outline: none;
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 1em;
}

.btn {
  width: 100%;
  padding: 12px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #369f6e;
}

.btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  color: #7f8c8d;
}

.auth-footer a {
  color: #42b983;
  text-decoration: none;
  font-weight: 600;
}

.auth-footer a:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-container {
    padding: 20px;
    margin: 0 15px;
  }
}
</style>