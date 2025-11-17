import React from 'react';
import { Link } from 'react-router-dom';
import articlesData from '../data/article.json';
import '../styles/featured-articles.css';

function FeaturedArticle() {
  // Get the most recent article (first one in the array)
  const featuredArticle = articlesData?.articles?.[0];

  if (!featuredArticle) return null;

  return (
    <section className="featured-article-section">
      <div className="container">
        <div className="featured-header">
          <span className="featured-badge">📰 Featured Article</span>
          <h2>Latest from Sandlot Insider</h2>
        </div>

        <div className="featured-article-card">
          <div className="featured-image">
            <img 
              src={featuredArticle.hero_image.url} 
              alt={featuredArticle.hero_image.alt}
            />
            <div className="featured-overlay"></div>
          </div>

          <div className="featured-content">
            <div className="featured-tags">
              {featuredArticle.tags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="featured-tag">{tag}</span>
              ))}
            </div>

            <h3 className="featured-title">{featuredArticle.title}</h3>

            <p className="featured-excerpt">
              {featuredArticle.content
                .find(item => item.type === 'paragraph')
                ?.text.substring(0, 200)}...
            </p>

            <div className="featured-meta">
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {featuredArticle.author}
              </span>
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {new Date(featuredArticle.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {featuredArticle.read_time_minutes} min read
              </span>
            </div>

            <Link 
              to={`/sandlot-insider/${featuredArticle.slug}`}
              className="featured-read-btn"
            >
              Read Full Article
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>

        <Link to="/sandlot-insider" className="view-all-link">
          View All Articles →
        </Link>
      </div>
    </section>
  );
}

export default FeaturedArticle;