<template>
  <div class="landing-page">
    <div class="background-overlay"></div>
    <header class="hero">
      <div class="container">
        <h1>NWatch Community Safety System</h1>
        <p class="subtitle">Empowering neighborhoods with real-time safety communication</p>
        <div class="cta-buttons">
          <router-link to="/login" class="btn btn-primary">Login</router-link>
          <router-link to="/register" class="btn btn-secondary">Register</router-link>
        </div>
      </div>
    </header>

    <section class="features">
      <div class="container">
        <h2>Key Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Incident Reporting</h3>
            <p>Quickly report safety concerns with location details for faster response.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-bullhorn"></i>
            <h3>Broadcast Alerts</h3>
            <p>Receive verified alerts from neighborhood administrators.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-map-marked-alt"></i>
            <h3>Neighborhood Map</h3>
            <p>Visualize incidents and safety resources in your area.</p>
          </div>
          <div class="feature-card">
            <i class="fas fa-users"></i>
            <h3>Community Engagement</h3>
            <p>Stay connected with your neighbors for a safer community.</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <p>&copy; 2025 NWatch Community Safety System. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'LandingPage'
}
</script>

<style scoped>
.landing-page {
  font-family: 'Arial', sans-serif;
  color: #333;
  height: 100vh;
  overflow: hidden;
  position: relative;
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

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero {
  color: white;
  padding: 100px 0;
  text-align: center;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 20px;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
  color: black;
}

.subtitle {
  font-size: 1.5rem;
  margin-bottom: 40px;
  opacity: 0.9;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  color: black;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.btn {
  padding: 12px 30px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #8811b8;
  color: black;
}

.btn-primary:hover {
  background-color: #369f6e;
}

.btn-secondary {
  background-color: transparent;
  color: black;
  border: 2px solid rgb(5, 5, 5);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.features {
  padding: 80px 0;
  background-color: rgba(249, 249, 249, 0.85);
}

.features h2 {
  text-align: center;
  margin-bottom: 50px;
  font-size: 2.5rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-10px);
}

.feature-card i {
  font-size: 3rem;
  color: #3498db;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

.footer {
  background-color: rgba(44, 62, 80, 0.9);
  color: white;
  padding: 30px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2.2rem;
  }
  
  .subtitle {
    font-size: 1.2rem;
  }
  
  .cta-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 200px;
    text-align: center;
  }
}
</style>