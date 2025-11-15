import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import articlesData from '../../../data/article.json';
import moreArticlesData from '../../../data/moreArticles.json';

function Article() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 4;

  // Combine all articles from both JSON files and sort by ID descending
  const allArticles = [
    ...(articlesData?.articles || []),
    ...(moreArticlesData?.articles || [])
  ].sort((a, b) => b.id - a.id); // Sort highest ID first (newest first)


  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTag]);

  // Check if data exists - AFTER all hooks
  if (allArticles.length === 0) {
    return (
      <section className="articles-page">
        <div className="container">
          <h1>Error Loading Articles</h1>
          <p>Articles data not found. Check console for errors.</p>
        </div>
      </section>
    );
  }

  // Get all unique tags from articles and count occurrences
  const tagCounts = {};
  const allUniqueTags = new Set();

  allArticles.forEach(article => {
    article.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      allUniqueTags.add(tag);
    });
  });

  // Sort by frequency and take top 10 for DISPLAY (plus 'all')
  const displayTags = ['all', ...Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag)
  ];

  // Filter articles by search and tag
  const filteredArticles = allArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'all' || article.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = filteredArticles.slice(startIndex, endIndex);

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handlePageClick = (pageNum) => {
    setCurrentPage(pageNum);
  };

  return (
    <section className="articles-page">
      <div className="container">
        {/* Hero Section */}
        <div className="articles-hero">
          <h1 className="page-title">Sandlot Insider</h1>
          <p className="page-subtitle">
            MLB news, stories, player projections, and sports betting insights — all powered by Sandlot Picks.
          </p>
        </div>

        {/* Search Box */}
        <div className="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tag Pills */}
        <div className="category-nav">
          {displayTags.map(tag => (
            <button
              key={tag}
              className={`category-pill ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag === 'all' ? '🏠 All Articles' : tag}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="articles-grid">
          {currentArticles.length > 0 ? (
            currentArticles.map(article => (
              <Link to={`/sandlot-insider/${article.slug}`} key={article.id} className="article-card">
                <div className="article-image">
                  <img src={article.hero_image.url} alt={article.hero_image.alt} />
                  <div className="article-overlay">
                    <span className="read-more">Read Article →</span>
                  </div>
                </div>
                <div className="article-content">
                  <div className="article-meta">
                    <span className="article-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {new Date(article.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span className="article-read-time">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {article.read_time_minutes} min read
                    </span>
                  </div>

                  <h2 className="article-title">{article.title}</h2>
                  <p className="article-summary">{article.summary}</p>

                  <div className="article-tags">
                    {article.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>

                  <div className="article-footer">
                    <span className="article-author">By {article.author}</span>
                    <span className="read-arrow">→</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="no-results">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <h3>No articles found</h3>
              <p>Try adjusting your search or tag filter</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && filteredArticles.length > 0 && (
          <div className="pagination">
            <button 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="pagination-btn"
              aria-label="Previous page"
            >
              ← Previous
            </button>

            <div className="pagination-numbers">
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                // Show first, last, current, and pages around current
                const showPage = 
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                
                const showEllipsis = 
                  (pageNum === 2 && currentPage > 3) ||
                  (pageNum === totalPages - 1 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return <span key={pageNum} className="pagination-ellipsis">...</span>;
                }

                if (!showPage) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageClick(pageNum)}
                    className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Article;