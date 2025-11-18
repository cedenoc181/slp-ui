import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import FeaturedArticle from './components/FeaturedArticles';
import Footer from './components/Footer';
import NotFound from './components/NotFound';


import AboutPage from './components/pages/About-Us/AboutPage';
import FeaturesPage from './components/pages/About-Us/FeaturesPage';
import ContactPage from './components/pages/About-Us/ContactPage';
import Glossary from './components/pages/Education/GlossaryPage';
import FAQPage from './components/pages/Education/FAQPage';
import HowToUsePage from './components/pages/Education/HowToUsePage';
import ResponsibleGaming from './components/pages/Education/responsibleGaming';
import Blogs from './components/pages/Research/blog';
import BlogPost from './components/pages/Research/blog-post';
import Articles from './components/pages/Research/articles';
import ArticlesPost from './components/pages/Research/ArticlesPost';
import DsBaseball from './components/pages/Research/ds_baseball';
import TermsOfUse from './components/legal/termsofuse';
import PrivacyPolicy from './components/legal/PrivacyPolicy';

// product page imports
import TeamAnalytics from './components/pages/Labs/teamAnalytics';

// styling imports
import './styles/chalkboard.css';
import './styles/featured-articles.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/about.css';
import './styles/about-page.css';
import './styles/features-page.css';
import './styles/contact-page.css';
import './styles/blog-page.css';
import './styles/articles.css';
import './styles/ds_baseball-page.css';
import './styles/features.css';
import './styles/footer.css';
import './styles/legal.css';
import './styles/faq.css';
import './styles/glossary.css';
import './styles/howtouse.css';
import './styles/responsibleGaming-page.css';
import './styles/team-analytics.css';

// Home page component
function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedArticle />
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
          <Route path="/team-analytics" element={<TeamAnalytics />} />

          <Route path="/glossary" element={<Glossary />} />
          <Route path="/faqs" element={<FAQPage />} />
          <Route path="/how-to-use" element={<HowToUsePage />} />
          <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/sandlot-insider" element={<Articles />} />
          <Route path="/sandlot-insider/:slug" element={<ArticlesPost />} />
          <Route path="/data-science" element={<DsBaseball />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          {/* 404 Catch-all route - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;