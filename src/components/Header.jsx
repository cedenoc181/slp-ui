import React, { useState } from 'react';
import '../styles/header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogoClick = () => {
    window.location.href = window.location.origin;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="logo" onClick={handleLogoClick}>
          <img src={require('../assets/images/spa-retro-logo-removebg.png')} alt="Sandlot Picks Analytics" />
        </div>
        
        {/* Hamburger Icon */}
        <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={isMenuOpen ? 'active' : ''}></span>
          <span className={isMenuOpen ? 'active' : ''}></span>
          <span className={isMenuOpen ? 'active' : ''}></span>
        </button>

        {/* Navigation */}
        <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;