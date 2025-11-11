import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import blogsData from '../../../data/blogs.json';

function BlogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get all unique tags
  const allTags = ['all', ...new Set(blogsData.blogs.flatMap(blog => blog.tags))];

  // Filter blogs
  const filteredBlogs = blogsData.blogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blog.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'all' || blog.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <section className="blog-page">
      <div className="container">
        {/* Hero Section */}
        <div className="blog-hero">
          <h1 className="page-title">Sandlot Picks Blog</h1>
          <p className="page-subtitle">
            Expert insights on baseball analytics, betting strategies, and data science
          </p>
        </div>

        {/* Search and Filter */}
        <div className="blog-controls">
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

          <div className="tag-filters">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag === 'all' ? 'All Posts' : tag}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Grid */}
        <div className="blog-grid">
          {filteredBlogs.length > 0 ? (
            filteredBlogs.map(blog => (
              <Link to={`/blogs/${blog.slug}`} key={blog.id} className="blog-card">
                <div className="blog-image">
                  <img src={blog.hero_image.url} alt={blog.hero_image.alt} />
                  <div className="blog-overlay">
                    <span className="read-more">Read Article →</span>
                  </div>
                </div>
                <div className="blog-content">
                  <div className="blog-meta">
                    <span className="blog-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {new Date(blog.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                    <span className="blog-read-time">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {blog.read_time_minutes} min read
                    </span>
                  </div>

                  <h2 className="blog-title">{blog.title}</h2>
                  <p className="blog-summary">{blog.summary}</p>

                  <div className="blog-tags">
                    {blog.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>

                  <div className="blog-footer">
                    <span className="blog-author">By {blog.author}</span>
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
              <p>Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default BlogPage;