import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';


// Home page component imports//
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import FeaturedArticle from './components/FeaturedArticles';
import Footer from './components/Footer';
import NotFound from './components/NotFound';

// More info page imports//
import AboutPage from './components/pages/About-Us/AboutPage';
import FeaturesPage from './components/pages/About-Us/FeaturesPage';
import ContactPage from './components/pages/About-Us/ContactPage';

// Education page imports//
import Glossary from './components/pages/Education/GlossaryPage';
import FAQPage from './components/pages/Education/FAQPage';
import HowToUsePage from './components/pages/Education/HowToUsePage';
import ResponsibleGaming from './components/pages/Education/responsibleGaming';

// Research page imports//
import Blogs from './components/pages/Research/blog';
import BlogPost from './components/pages/Research/blog-post';
import Articles from './components/pages/Research/articles';
import ArticlesPost from './components/pages/Research/ArticlesPost';
import DsBaseball from './components/pages/Research/ds_baseball';

// Legal page imports//
import TermsOfUse from './components/legal/termsofuse';
import PrivacyPolicy from './components/legal/PrivacyPolicy';

// Stats page imports//
import MLBStandings from './components/pages/Stats/mlb-standings/mlbStandings';
import TeamAnalytics from './components/pages/Stats/teamAnalytics';
import PlayerAnalytics from './components/pages/Stats/playerAnalytics';

// styling imports
import './styles/chalkboard.css';

// Home-page-styles//
import './styles/home-page-styling/header.css';
import './styles/home-page-styling/hero.css';
import './styles/home-page-styling/featured-articles.css';
import './styles/home-page-styling/about.css';
import './styles/home-page-styling/features.css';
import './styles/home-page-styling/footer.css';

// Stats-page-styles//
import './styles/stats-page-styling/team-analytics.css';
import './styles/stats-page-styling/mlb-standings.css';
import './styles/stats-page-styling/player-analytics.css';


//Insights-page-styles//
import './styles/insights-page-styling/blog-page.css';
import './styles/insights-page-styling/articles.css';
import './styles/insights-page-styling/ds_baseball-page.css';

//Education-page-styles//
import './styles/education-page-styling/faq.css';
import './styles/education-page-styling/glossary.css';
import './styles/education-page-styling/howtouse.css';
import './styles/education-page-styling/responsibleGaming-page.css';

//More-info-page-styles//
import './styles/more-page-styling/about-page.css';
import './styles/more-page-styling/features-page.css';
import './styles/more-page-styling/contact-page.css';

// Legal-page-styles//
import './styles/legal-page-styling/legal.css';


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

          {/* More routes */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Stats routes */}
          <Route path="/mlb-standings" element={<MLBStandings />} />
          <Route path="/team-analytics" element={<TeamAnalytics />} />
          <Route path="/team-analytics/:teamName" element={<TeamAnalytics />} />
          <Route path="/player-analytics" element={<PlayerAnalytics />} />

          {/* Education routes */}
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/faqs" element={<FAQPage />} />
          <Route path="/how-to-use" element={<HowToUsePage />} />
          <Route path="/responsible-gaming" element={<ResponsibleGaming />} />

          {/* Insights routes */}
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/:slug" element={<BlogPost />} />
          <Route path="/sandlot-insider" element={<Articles />} />
          <Route path="/sandlot-insider/:slug" element={<ArticlesPost />} />
          <Route path="/data-science" element={<DsBaseball />} />

          {/* legal routes */}
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