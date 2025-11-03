import React, { useEffect } from 'react';
import ReactGA from 'react-ga4';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import Footer from './components/Footer';
import './styles/chalkboard.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/about.css';
import './styles/features.css';
import './styles/footer.css';

function App() {
  useEffect(() => {
    // Track initial page view
    ReactGA.send({ 
      hitType: "pageview", 
      page: window.location.pathname + window.location.search 
    });
  }, []);
  
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
