function Header() {
  const handleLogoClick = () => {
    window.location.href = window.location.origin;
  };

  return (
    <header className="header">
      <div className="container">
        <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <img src={require('../assets/images/spa-retro-logo-removebg.png')} alt="Sandlot Picks Analytics" />
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