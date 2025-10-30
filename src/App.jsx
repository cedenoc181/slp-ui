import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Features from './components/Features';
import Footer from './components/Footer';
import './styles/chalkboard.css';
import './styles/header.css';
import './styles/hero.css';

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
