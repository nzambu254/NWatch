<template>
  <div class="auth-page">
    <div class="background-overlay"></div>
    <div class="auth-container">
      <div class="logo-container">
        <h1>NWatch</h1>
      </div>
      <h2 class="auth-title">Welcome back</h2>
      <p class="auth-subtitle">Please enter your details to sign in</p>
      
      <form @submit.prevent="login">
        <div class="form-group">
          <label for="email">Email</label>
          <div class="input-container">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <input type="email" id="email" v-model="email" placeholder="Enter your email" required>
          </div>
        </div>
        
        <div class="form-group">
          <div class="label-row">
            <label for="password">Password</label>
            <button type="button" class="forgot-password" @click="showForgotPassword = true">Forgot password?</button>
          </div>
          <div class="input-container">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <input :type="showPassword ? 'text' : 'password'" id="password" v-model="password" placeholder="Enter your password" required>
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
        
        <button type="submit" class="btn btn-primary" :disabled="loading">
          <span v-if="loading">
            <svg class="spinner" viewBox="0 0 50 50">
              <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
            </svg>
            Signing in...
          </span>
          <span v-else>Sign In</span>
        </button>
      </form>
      
      <p class="auth-footer">
        Don't have an account? <router-link to="/register">Sign up</router-link>
      </p>
    </div>

    <!-- Forgot Password Modal -->
    <div v-if="showForgotPassword" class="modal-overlay">
      <div class="modal-container">
        <button class="modal-close" @click="showForgotPassword = false">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3>Reset Password</h3>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
        
        <form @submit.prevent="sendPasswordReset">
          <div class="form-group">
            <label for="reset-email">Email</label>
            <div class="input-container">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input type="email" id="reset-email" v-model="resetEmail" placeholder="Enter your email" required>
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary" :disabled="resetLoading">
            {{ resetLoading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </form>
        
        <div v-if="resetSuccess" class="reset-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#42b983" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p>Password reset email sent! Please check your inbox.</p>
        </div>
        
        <div v-if="resetError" class="reset-error">
          {{ resetError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { auth, db } from '../../services/firebase'
import { useRouter } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'

export default {
  name: 'Login',
  setup() {
    const email = ref('')
    const password = ref('')
    const loading = ref(false)
    const router = useRouter()
    
    // Forgot password
    const showForgotPassword = ref(false)
    const resetEmail = ref('')
    const resetLoading = ref(false)
    const resetSuccess = ref(false)
    const resetError = ref('')
    
    // Password visibility
    const showPassword = ref(false)

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
    
    const sendPasswordReset = async () => {
      resetLoading.value = true
      resetSuccess.value = false
      resetError.value = ''
      
      try {
        await sendPasswordResetEmail(auth, resetEmail.value)
        resetSuccess.value = true
      } catch (error) {
        resetError.value = error.message
      } finally {
        resetLoading.value = false
      }
    }

    return { 
      email, 
      password, 
      loading, 
      login,
      showPassword,
      showForgotPassword,
      resetEmail,
      resetLoading,
      resetSuccess,
      resetError,
      sendPasswordReset
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
  position: relative;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('/assets/dolp.jpeg');
  background-size: cover;
  background-position: center;
  opacity: 0.6;
  z-index: -1;
}

.auth-container {
  background: #000000;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 420px;
  margin: 20px;
}

.logo-container {
  text-align: center;
  margin-bottom: 20px;
}

.logo-container h1 {
  color: #42b983;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.auth-title {
  text-align: center;
  margin-bottom: 8px;
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
}

.auth-subtitle {
  text-align: center;
  margin-bottom: 30px;
  color: #cccccc;
  font-size: 15px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #ffffff;
  font-size: 14px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-password {
  background: none;
  border: none;
  color: #42b983;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.forgot-password:hover {
  text-decoration: underline;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #95a5a6;
  width: 20px;
  height: 20px;
}

.input-container input {
  width: 100%;
  padding: 12px 12px 12px 40px;
  border: 1px solid #333333;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s;
  background-color: #1a1a1a;
  color: #ffffff;
}

.input-container input::placeholder {
  color: #999999;
}

.input-container input:focus {
  border-color: #42b983;
  outline: none;
  background-color: #1a1a1a;
  box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.password-toggle {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #95a5a6;
  cursor: pointer;
  padding: 0;
  display: flex;
}

.password-toggle:hover {
  color: #42b983;
}

.btn {
  width: 100%;
  padding: 14px;
  background-color: #4258b9;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.btn:hover {
  background-color: #369f6e;
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
  transform: none;
}

.auth-footer {
  text-align: center;
  margin-top: 25px;
  color: #cccccc;
  font-size: 14px;
}

.auth-footer a {
  color: #ff8c00;
  text-decoration: none;
  font-weight: 500;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Spinner animation */
.spinner {
  animation: rotate 1.4s linear infinite;
  width: 20px;
  height: 20px;
}

.spinner .path {
  stroke: white;
  stroke-linecap: round;
  animation: dash 1.4s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background: #000000;
  padding: 30px;
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  position: relative;
  margin: 20px;
}

.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  cursor: pointer;
  color: #cccccc;
  padding: 5px;
}

.modal-close:hover {
  color: #ffffff;
}

.modal-container h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #ffffff;
}

.modal-container p {
  margin-bottom: 20px;
  color: #cccccc;
  font-size: 14px;
}

.reset-success {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  background-color: #0f2e1b;
  border-radius: 8px;
  color: #42b983;
  font-size: 14px;
}

.reset-error {
  margin-top: 20px;
  padding: 12px;
  background-color: #2e0f0f;
  border-radius: 8px;
  color: #e74c3c;
  font-size: 14px;
}

@media (max-width: 480px) {
  .auth-container {
    padding: 25px;
    margin: 15px;
  }
  
  .modal-container {
    padding: 25px;
    margin: 15px;
  }
}
</style>