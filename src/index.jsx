import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/App.css';
import App from './App';
import ReactGA from 'react-ga4';


// Initialize Google Analytics with environment variable
ReactGA.initialize('G-SYNN1KZYYW');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
