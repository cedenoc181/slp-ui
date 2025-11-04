function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <h3 className="footer-heading">About</h3>
            <p className="footer-text">© {new Date().getFullYear()} Sandlot Picks Analytics. All rights reserved.</p>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-heading">Follow Us</h3>
            <div className="social-links">
              <a href="https://x.com/Sandlot_Picks" className="footer-link" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://discord.com/invite/CQsrtNp4S7" className="footer-link" target="_blank" rel="noopener noreferrer">Discord</a>
              <a href="https://www.threads.net/@sandlotpicks" className="footer-link" target="_blank" rel="noopener noreferrer">Threads</a>
              <a href="https://www.instagram.com/sandlotpicks" className="footer-link" target="_blank" rel="noopener noreferrer">Instagram</a>
            </div>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-heading">Contact</h3>
            <a href="mailto:sandlotpicksanalytics@gmail.com" className="footer-link">sandlotpicksanalytics@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;