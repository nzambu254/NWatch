<template>
  <div class="auth-page">
    <div class="auth-container">
      <h1>Login to NWatch</h1>
      <form @submit.prevent="login">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" required>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      <p class="auth-footer">
        Don't have an account? <router-link to="/register">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { auth, db } from '../../services/firebase'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default {
  name: 'Login',
  setup() {
    const email = ref('')
    const password = ref('')
    const loading = ref(false)
    const router = useRouter()

    const login = async () => {
      loading.value = true
      
      try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.value,
          password.value
        )
        const user = userCredential.user

        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          
          // Check if admin/police is approved
          if ((userData.role === 'admin' || userData.role === 'police') && !userData.approved) {
            await auth.signOut()
            alert('Your account is pending approval. Please contact the system administrator.')
            return
          }

          // Store user data in sessionStorage for immediate access
          sessionStorage.setItem('userData', JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: userData.role,
            approved: userData.approved
          }))

          // Redirect to appropriate dashboard based on role
          let redirectPath = '/dashboard' // default for residents
          if (userData.role === 'admin') {
            redirectPath = '/admin/dashboard'
          } else if (userData.role === 'police') {
            redirectPath = '/police/dashboard'
          }
          
          await router.push(redirectPath)
        } else {
          throw new Error('User data not found')
        }
      } catch (error) {
        alert(error.message)
      } finally {
        loading.value = false
      }
    }

    return { email, password, loading, login }
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
  max-width: 400px;
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

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  border-color: #42b983;
  outline: none;
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