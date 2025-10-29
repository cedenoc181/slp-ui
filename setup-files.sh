#!/bin/bash

# Create index.jsx
cat > src/index.jsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/App.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# Create App.jsx
cat > src/App.jsx << 'EOF'
import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import Footer from './components/Footer';
import './styles/chalkboard.css';

function App() {
  return (
    <div className="App">
      <Header />
      <Hero />
      <About />
      <Features />
      <Footer />
    </div>
  );
}

export default App;
EOF

# Create Header.jsx
cat > src/components/Header.jsx << 'EOF'
import React from 'react';

function Header() {
  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <img src={require('../assets/images/logo.png')} alt="Sandlot Picks Analytics" />
        </div>
        <nav className="nav">
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;
EOF

# Create Hero.jsx
cat > src/components/Hero.jsx << 'EOF'
import React from 'react';

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="chalk-text">Sandlot Picks Analytics</h1>
        <p className="chalk-subtitle">Smart analytics for smarter picks</p>
        <button className="cta-button">Get Started</button>
      </div>
    </section>
  );
}

export default Hero;
EOF

# Create About.jsx
cat > src/components/About.jsx << 'EOF'
import React from 'react';

function About() {
  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="chalk-heading">What is Sandlot Picks Analytics?</h2>
        <p className="chalk-text">
          Sandlot Picks Analytics is a powerful tool that helps you make data-driven 
          decisions with comprehensive analytics, real-time predictions, and detailed 
          performance tracking.
        </p>
      </div>
    </section>
  );
}

export default About;
EOF

# Create Features.jsx
cat > src/components/Features.jsx << 'EOF'
import React from 'react';

function Features() {
  const features = [
    {
      title: 'Discord Predictions',
      description: 'Get real-time predictions directly in your Discord server'
    },
    {
      title: 'Advanced Charts',
      description: 'Visualize your picks with detailed analytics and trends'
    },
    {
      title: 'Pick Analysis',
      description: 'Deep dive into performance metrics and insights'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <h2 className="chalk-heading">Features</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <h3 className="chalk-subheading">{feature.title}</h3>
              <p className="chalk-text">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
EOF

# Create Footer.jsx
cat > src/components/Footer.jsx << 'EOF'
import React from 'react';

function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <p className="chalk-text">© 2024 Sandlot Picks Analytics. All rights reserved.</p>
        <div className="social-links">
          <a href="#" className="chalk-link">Twitter</a>
          <a href="#" className="chalk-link">Discord</a>
          <a href="#" className="chalk-link">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
EOF

# Create App.css
cat > src/styles/App.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}
EOF

# Create chalkboard.css
cat > src/styles/chalkboard.css << 'EOF'
body {
  background-color: #2d5016;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
  color: #f0f0f0;
}

.chalk-text {
  color: #f0f0f0;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  font-family: 'Courier New', monospace;
}

.chalk-heading {
  color: #ffffff;
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  margin-bottom: 1.5rem;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.chalk-subheading {
  color: #f0f0f0;
  font-size: 1.5rem;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.4);
  margin-bottom: 1rem;
  font-family: 'Courier New', monospace;
}

.chalk-subtitle {
  color: #e0e0e0;
  font-size: 1.2rem;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  font-family: 'Courier New', monospace;
}

.chalk-link {
  color: #90EE90;
  text-decoration: none;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  transition: color 0.3s;
}

.chalk-link:hover {
  color: #ffffff;
}

.header {
  background-color: rgba(35, 64, 18, 0.9);
  padding: 1.5rem 0;
  border-bottom: 3px solid rgba(255, 255, 255, 0.2);
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo img {
  height: 60px;
}

.nav {
  display: flex;
  gap: 2rem;
}

.nav a {
  color: #f0f0f0;
  text-decoration: none;
  font-size: 1.1rem;
  font-family: 'Courier New', monospace;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  transition: color 0.3s;
}

.nav a:hover {
  color: #90EE90;
}

.hero {
  padding: 6rem 0;
  text-align: center;
}

.hero h1 {
  font-size: 3.5rem;
  margin-bottom: 1rem;
}

.cta-button {
  background-color: #90EE90;
  color: #2d5016;
  border: none;
  padding: 1rem 2.5rem;
  font-size: 1.2rem;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  cursor: pointer;
  margin-top: 2rem;
  border-radius: 5px;
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.5);
}

.about {
  padding: 4rem 0;
  text-align: center;
  background-color: rgba(35, 64, 18, 0.5);
}

.about p {
  max-width: 800px;
  margin: 0 auto;
  font-size: 1.2rem;
  line-height: 1.8;
}

.features {
  padding: 4rem 0;
}

.features h2 {
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  background-color: rgba(35, 64, 18, 0.7);
  padding: 2rem;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: #90EE90;
}

.feature-card h3 {
  margin-bottom: 1rem;
}

.footer {
  background-color: rgba(35, 64, 18, 0.9);
  padding: 2rem 0;
  text-align: center;
  border-top: 3px solid rgba(255, 255, 255, 0.2);
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1rem;
}
EOF

echo "✅ All files created successfully!"
echo "📝 Next steps:"
echo "1. Add your logo to: src/assets/images/logo.png"
echo "2. Run: npm start"