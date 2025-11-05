import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import AboutPage from './components/pages/About-Us/AboutPage';
import FeaturesPage from './components/pages/About-Us/FeaturesPage';
import ContactPage from './components/pages/About-Us/ContactPage';
import Footer from './components/Footer';
import TermsOfUse from './components/legal/termsofuse';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import './styles/chalkboard.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/about.css';
import './styles/about-page.css';
import './styles/features-page.css';
import './styles/contact-page.css';
import './styles/features.css';
import './styles/footer.css';
import './styles/legal.css';

// Home page component
function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Features />
    </>
  );
}

// Analytics tracker component
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ 
      hitType: "pageview", 
      page: location.pathname + location.search 
    });
  }, [location]);

  return null;
}

function App() {
  return (
    <Router>
      <div className="App">
        <AnalyticsTracker />
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;