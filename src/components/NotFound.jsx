import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
  useEffect(() => {
    document.title = '404 - Page Not Found | Sandlot Picks';
  }, []);

  return (
    <section className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <h1 className="error-code">404</h1>
          <h2>Page Not Found</h2>
          <p>Sorry, the page you're looking for doesn't exist or has been moved.</p>
          
          <div className="not-found-actions">
            <Link to="/" className="btn-primary">
              Return to Home
            </Link>
            <Link to="/sandlot-insider" className="btn-secondary">
              Browse Articles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotFound;