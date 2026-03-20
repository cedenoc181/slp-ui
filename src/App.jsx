import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, matchPath } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { AuthProvider } from './context/AuthContext';

import ApiTestPage from './components/ApiTestPage';
import ProtectedRoute from './components/ProtectedRoute';


// Home page component imports//
import Header from './components/Header';
import Hero from './components/Hero';
import StatsPreview from './components/StatsPreview';
import PredictionsTeaser from './components/PredictionsTeaser';
import HowItWorks from './components/HowItWorks';
import TeamsCarousel from './components/TeamsCarousel';
// import About from './components/About';
// import Features from './components/Features';
// import FeaturedArticle from './components/FeaturedArticles';
import Footer from './components/Footer';
import NotFound from './components/NotFound';

// More info page imports//
import AboutPage from './components/pages/About-Us/AboutPage';
import FeaturesPage from './components/pages/About-Us/FeaturesPage';
import ContactPage from './components/pages/About-Us/ContactPage';
import UnsubscribePage from './components/pages/About-Us/UnsubscribePage';

// Account page imports
import AccountPage from './components/pages/Account/AccountPage';
import SettingsPage from './components/pages/Account/SettingsPage';
import ResetPasswordPage from './components/pages/Account/ResetPasswordPage';

// Admin page imports//
import AdminPage from './components/pages/Admin/AdminPage';
import ArticleEditor from './components/pages/Admin/ArticleEditor';

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
import MLBSchedule from './components/pages/Stats/mlb-schedule/mlbSchedule';
import MatchupDetail from './components/pages/Stats/mlb-schedule/MatchupDetail';
import MatchupDetailAnalysis from './components/pages/Stats/mlb-schedule/MatchupDetailAnalysis';
import TeamAnalytics from './components/pages/Stats/team-analytics/teamAnalytics';
import PlayerAnalytics from './components/pages/Stats/player-analytics/playerAnalytics';
import PlayerProfileStats from './components/pages/Stats/player-analytics/playerProfileStats';

// Predictions
import PredictionsOverview from './components/pages/predictions/PredictionsOverview';
import GameProps from './components/pages/predictions/GameProps';
import PitcherProps from './components/pages/predictions/PitcherProps';
import BatterProps from './components/pages/predictions/BatterProps';

// styling imports
import './styles/chalkboard.css';

// Home-page-styles//
import './styles/home-page-styling/header.css';
import './styles/home-page-styling/hero.css';
// import './styles/home-page-styling/featured-articles.css';
// import './styles/home-page-styling/about.css';
// import './styles/home-page-styling/features.css';
import './styles/home-page-styling/footer.css';

// Stats-page-styles//
import './styles/stats-page-styling/mlb-schedule.css';
import './styles/stats-page-styling/matchup-detail.css';
import './styles/stats-page-styling/team-analytics.css';
import './styles/stats-page-styling/mlb-standings.css';
import './styles/stats-page-styling/player-analytics.css';
import './styles/stats-page-styling/batter-stats.css';
import './styles/stats-page-styling/player-profile.css';


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

//Account-page-styles//
import './styles/account-page-styling/account-page.css';
import './styles/account-page-styling/settings-page.css';

//Admin-page-styles//
import './styles/admin-page-styling/admin.css';

// Legal-page-styles//
import './styles/legal-page-styling/legal.css';


// Home page component
function HomePage() {
  return (
    <>
      <Hero />
      <StatsPreview />
      <PredictionsTeaser />
      <HowItWorks />
      <TeamsCarousel />
    </>
  );
}

const PAGE_TITLES = [
  { path: '/',                          title: 'Home' },
  { path: '/mlb-schedule',             title: 'MLB Schedule' },
  { path: '/mlb-schedule/:gameId',          title: 'Matchup Detail' },
  { path: '/mlb-schedule/:gameId/analysis', title: 'Advanced Analysis' },
  { path: '/mlb-standings',            title: 'MLB Standings' },
  { path: '/team-analytics',           title: 'Team Analytics' },
  { path: '/team-analytics/:teamName', title: 'Team Analytics', param: 'teamName' },
  { path: '/player-analytics',         title: 'Player Analytics' },
  { path: '/player/:nameSlug',         title: 'Player Profile', param: 'nameSlug' },
  { path: '/sandlot-insider',          title: 'Sandlot Insider' },
  { path: '/sandlot-insider/:slug',    title: 'Sandlot Insider Article' },
  { path: '/blogs',                    title: 'Blogs' },
  { path: '/blogs/:slug',              title: 'Blog Post' },
  { path: '/data-science',             title: 'Data Science' },
  { path: '/glossary',                 title: 'Glossary' },
  { path: '/faqs',                     title: 'FAQs' },
  { path: '/how-to-use',              title: 'How To Use' },
  { path: '/responsible-gaming',       title: 'Responsible Gaming' },
  { path: '/about',                    title: 'About Us' },
  { path: '/features',                 title: 'Features' },
  { path: '/contact',                  title: 'Contact' },
  // { path: '/account',                  title: 'My Account' },
  // { path: '/account/settings',         title: 'Account Settings' },
  { path: '/terms-of-use',            title: 'Terms of Use' },
  { path: '/privacy-policy',          title: 'Privacy Policy' },
  { path: '/admin',                    title: 'Admin' },
  { path: '/admin/new',               title: 'Admin – New Article' },
  { path: '/admin/edit/:id',          title: 'Admin – Edit Article' },
  { path: '/predictions',             title: 'Predictions' },
  { path: '/predictions/games',       title: 'Game Props' },
  { path: '/predictions/pitchers',    title: 'Pitcher Props' },
  { path: '/predictions/batters',     title: 'Batter Props' },
  { path: '/unsubscribe',             title: 'Unsubscribe' },
];

const SITE_NAME = 'Sandlot Picks';

function formatParam(raw) {
  return raw
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPageTitle(pathname) {
  for (const entry of PAGE_TITLES) {
    const match = matchPath({ path: entry.path, end: true }, pathname);
    if (match) {
      if (entry.param) {
        const paramVal = match.params[entry.param];
        if (paramVal) {
          return `${formatParam(decodeURIComponent(paramVal))} – ${entry.title} | ${SITE_NAME}`;
        }
      }
      return `${entry.title} | ${SITE_NAME}`;
    }
  }
  return SITE_NAME;
}

// Analytics tracker component
function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const title = getPageTitle(location.pathname);
    document.title = title;
    ReactGA.send({
      hitType: "pageview",
      page: location.pathname + location.search,
      title,
    });
  }, [location]);

  return null;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AnalyticsTracker />
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
          {/* test route */}
          <Route path="/api-test" element={<ApiTestPage />} />
          {/* More routes */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Account routes */}
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Stats routes */}
          <Route path="/mlb-schedule" element={<MLBSchedule />} />
          <Route path="/mlb-schedule/:gameId" element={<MatchupDetail />} />
          <Route path="/mlb-schedule/:gameId/analysis" element={<MatchupDetailAnalysis />} />
          <Route path="/mlb-standings" element={<MLBStandings />} />
          <Route path="/team-analytics" element={<TeamAnalytics />} />
          <Route path="/team-analytics/:teamName" element={<TeamAnalytics />} />
          <Route path="/player-analytics" element={<PlayerAnalytics />} />
          <Route path="/player/:nameSlug" element={<PlayerProfileStats />} />

          {/* Predictions routes */}
          <Route path="/predictions" element={<PredictionsOverview />} />
          <Route path="/predictions/games" element={<GameProps />} />
          <Route path="/predictions/pitchers" element={<PitcherProps />} />
          <Route path="/predictions/batters" element={<BatterProps />} />

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

          {/* Admin routes — requires is_admin */}
          <Route path="/admin" element={
            <ProtectedRoute require="admin"><AdminPage /></ProtectedRoute>
          } />
          <Route path="/admin/new" element={
            <ProtectedRoute require="admin"><ArticleEditor /></ProtectedRoute>
          } />
          <Route path="/admin/edit/:id" element={
            <ProtectedRoute require="admin"><ArticleEditor /></ProtectedRoute>
          } />

          {/* Unsubscribe route */}
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

          {/* 404 Catch-all route - must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
