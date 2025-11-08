import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import blogsData from '../../../data/blogs.json';
import '../../../styles/blog-post.css';

function BlogPost() {
  const { slug } = useParams();
  const blog = blogsData.blogs.find(b => b.slug === slug);

  useEffect(() => {
    if (!blog) return;

    // Scroll to top
    window.scrollTo(0, 0);

    // Set SEO meta tags
    document.title = blog.seo.title_tag;

    // Meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', blog.seo.meta_description);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', blog.seo.canonical_url);

    // Open Graph tags for social sharing
    const ogTags = [
      { property: 'og:title', content: blog.seo.title_tag },
      { property: 'og:description', content: blog.seo.meta_description },
      { property: 'og:image', content: blog.seo.og_image },
      { property: 'og:url', content: blog.seo.canonical_url },
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: blog.date },
      { property: 'article:author', content: blog.author }
    ];

    ogTags.forEach(({ property, content }) => {
      let metaTag = document.querySelector(`meta[property="${property}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', property);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    });

    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: blog.seo.title_tag },
      { name: 'twitter:description', content: blog.seo.meta_description },
      { name: 'twitter:image', content: blog.seo.og_image }
    ];

    twitterTags.forEach(({ name, content }) => {
      let metaTag = document.querySelector(`meta[name="${name}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    });

    // Cleanup on unmount
    return () => {
      document.title = 'Sandlot Picks Analytics';
    };
  }, [blog]);

  if (!blog) {
    return (
      <section className="blog-post-page">
        <div className="container">
          <div className="blog-not-found">
            <h1>Blog Post Not Found</h1>
            <p>The article you're looking for doesn't exist.</p>
            <Link to="/blogs" className="back-btn">← Back to all Blogs</Link>
          </div>
        </div>
      </section>
    );
  }

  const renderContent = (item) => {
    switch (item.type) {
      case 'heading':
        return <h2 key={Math.random()}>{item.text}</h2>;
      
      case 'paragraph':
        return <p key={Math.random()}>{item.text}</p>;
      
      case 'list':
        return (
          <ul key={Math.random()}>
            {item.items.map((listItem, idx) => (
              <li key={idx}>{listItem}</li>
            ))}
          </ul>
        );
      
      case 'quote':
        return (
          <blockquote key={Math.random()}>
            <p>{item.text}</p>
            {item.author && <cite>— {item.author}</cite>}
          </blockquote>
        );
      
      default:
        return null;
    }
  };

  return (
    <section className="blog-post-page">
      <div className="container">
        {/* Back Button */}
        <Link to="/blogs" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to all Blogs
        </Link>

        {/* Article Header */}
        <article className="blog-article">
          <header className="article-header">
            <div className="article-tags">
              {blog.tags.map((tag, idx) => (
                <span key={idx} className="tag">{tag}</span>
              ))}
            </div>
            
            <h1 className="article-title">{blog.title}</h1>
            
            <div className="article-meta">
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {blog.author}
              </span>
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {new Date(blog.date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {blog.read_time_minutes} min read
              </span>
            </div>

            {/* Hero Image */}
            <div className="article-hero-image">
              <img src={blog.hero_image.url} alt={blog.hero_image.alt} />
            </div>
          </header>

          {/* Article Content */}
          <div className="article-content">
            {blog.content.map((item) => renderContent(item))}
          </div>

          {/* Article Footer */}
          <footer className="article-footer">
            <div className="share-section">
              <h3>Share this blog</h3>
              <div className="share-buttons">
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(blog.seo.canonical_url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn twitter"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(blog.seo.canonical_url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a 
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(blog.seo.canonical_url)}&title=${encodeURIComponent(blog.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn linkedin"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            <Link to="/blogs" className="back-to-blog">
              ← Back to All Blogs
            </Link>
          </footer>
        </article>
      </div>
    </section>
  );
}

export default BlogPost;