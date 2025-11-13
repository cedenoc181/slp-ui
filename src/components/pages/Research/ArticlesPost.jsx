import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import articlesData from '../../../data/article.json';
import '../../../styles/articles-post.css';

function ArticlePost() {
  const { slug } = useParams();
  const article = articlesData.articles.find(a => a.slug === slug);

  useEffect(() => {
    if (!article) return;

    window.scrollTo(0, 0);

    // Set SEO meta tags
    document.title = article.seo.title_tag;

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', article.seo.meta_description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', article.seo.canonical_url);

    // Keywords meta tag
    let keywords = document.querySelector('meta[name="keywords"]');
    if (!keywords) {
      keywords = document.createElement('meta');
      keywords.setAttribute('name', 'keywords');
      document.head.appendChild(keywords);
    }
    keywords.setAttribute('content', article.seo.keywords.join(', '));

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: article.seo.title_tag },
      { property: 'og:description', content: article.seo.meta_description },
      { property: 'og:image', content: article.seo.og_image },
      { property: 'og:url', content: article.seo.canonical_url },
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: article.date },
      { property: 'article:author', content: article.author }
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
      { name: 'twitter:title', content: article.seo.title_tag },
      { name: 'twitter:description', content: article.seo.meta_description },
      { name: 'twitter:image', content: article.seo.og_image }
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
    
    // Create JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.title,
      "image": {
        "@type": "ImageObject",
        "url": article.hero_image.url,
        "width": 1200,
        "height": 630
      },
      "datePublished": article.date,
      "dateModified": article.date,
      "author": {
        "@type": "Organization",
        "name": article.author,
        "url": "https://sandlotpicks.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Sandlot Picks",
        "logo": {
          "@type": "ImageObject",
          "url": "https://sandlotpicks.com/logo.png",
          "width": 600,
          "height": 60
        }
      },
      "description": article.seo.meta_description,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": article.seo.canonical_url
      },
      "keywords": article.seo.keywords.join(', '),
      "articleSection": article.tags[0] || "Baseball",
      "wordCount": article.content.reduce((count, item) => {
        if (item.type === 'paragraph') {
          return count + item.text.split(' ').length;
        }
        return count;
      }, 0),
      "timeRequired": `PT${article.read_time_minutes}M`
      };

      // Insert or update the script tag
      let scriptTag = document.querySelector('script[type="application/ld+json"]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
  
    return () => {
      document.title = 'Sandlot Picks Analytics';

      // Reset or remove description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 'Expert baseball analytics, betting insights, and data-driven picks. Your trusted source for MLB betting strategy and analysis.');
      }

      // Remove article-specific canonical link
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.remove();
      }

      // Remove keywords meta tag (optional - usually not needed on other pages)
      const keywords = document.querySelector('meta[name="keywords"]');
      if (keywords) {
        keywords.remove();
      }

      // Remove Open Graph tags (optional - prevents sharing wrong content)
      const ogProperties = [
        'og:title',
        'og:description', 
        'og:image',
        'og:url',
        'og:type',
        'article:published_time',
        'article:author'
      ];

      ogProperties.forEach(property => {
        const metaTag = document.querySelector(`meta[property="${property}"]`);
        if (metaTag) {
          metaTag.remove();
        }
      });
    
        // Remove Twitter Card tags (optional)
      const twitterNames = [
        'twitter:card',
        'twitter:title',
        'twitter:description',
        'twitter:image'
      ];

      twitterNames.forEach(name => {
        const metaTag = document.querySelector(`meta[name="${name}"]`);
        if (metaTag) {
          metaTag.remove();
        }
      });

      // Remove structured data script
      const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
      if (structuredDataScript) {
        structuredDataScript.remove();
      }
    };
  }, [article]);

  if (!article) {
    return (
      <section className="article-post-page">
        <div className="container">
          <div className="article-not-found">
            <h1>Article Not Found</h1>
            <p>The article you're looking for doesn't exist.</p>
            <Link to="/sandlot-insider" className="back-btn">← Back to Articles</Link>
          </div>
        </div>
      </section>
    );
  }

    const renderContent = (item, index) => {
      switch (item.type) {
        case 'heading':
          return <h2 key={`heading-${index}`}>{item.text}</h2>;
        
        case 'subheading':
          return <h3 key={`subheading-${index}`}>{item.text}</h3>;
        
        case 'paragraph':
          return <p key={`paragraph-${index}`}>{item.text}</p>;
        
        case 'list':
          return (
            <ul key={`list-${index}`}>
              {item.items.map((listItem, idx) => (
                <li key={`list-${index}-${idx}`}>{listItem}</li>
              ))}
            </ul>
          );
        
        case 'quote':
          return (
            <blockquote key={`quote-${index}`}>
              <p>{item.text}</p>
              {item.author && <cite>— {item.author}</cite>}
            </blockquote>
          );
        
        default:
          return null;
      }
    };

  return (
    <section className="article-post-page">
      <div className="container">
        <Link to="/sandlot-insider" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Articles
        </Link>

        <article className="article-detail">
          <header className="article-header">
            {/* Tags at the top */}
            <div className="article-tags-top">
              {article.tags.slice(0, 5).map((tag, idx) => (
                <span key={idx} className="tag">{tag}</span>
              ))}
            </div>
            
            <h1 className="article-title">{article.title}</h1>
            
            <div className="article-meta">
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {article.author}
              </span>
              <span className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {new Date(article.date).toLocaleDateString('en-US', { 
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
                {article.read_time_minutes} min read
              </span>
            </div>

            <div className="article-hero-image">
              <img src={article.hero_image.url} alt={article.hero_image.alt} />
            </div>
          </header>

          <div className="article-body">
            {article.content.map((item, index) => (
              <div key={index}>{renderContent(item)}</div>
            ))}
          </div>

        {/* Affiliate CTA - only if it exists in JSON */}
        {article.affiliate_cta?.enabled && (
            <>
            <div className="affiliate-disclaimer-header">
              <p>Advertisement</p>
            </div>       
             <div 
               className="affiliate-cta"
               style={{
                 backgroundImage: article.affiliate_cta['hero-banner'] 
                   ? `url(${article.affiliate_cta['hero-banner']})` 
                   : 'none'
               }}
             >
            
              <div className="affiliate-cta-content">
                <h3>{article.affiliate_cta.platform}</h3>
                <p className="affiliate-offer">{article.affiliate_cta.offer}</p>
                <p className="affiliate-context">{article.affiliate_cta.context}</p>

                <a 
                  href={article.affiliate_cta.link} 
                  target="_blank" 
                  rel="noopener noreferrer sponsored"
                  className="affiliate-btn"
                >
                  Get Started with {article.affiliate_cta.platform} →
                </a>
              </div>
            </div>
          </>
        )}

          <footer className="article-footer">
            <div className="share-section">
              <h3>Share this article</h3>
              <div className="share-buttons">
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(article.seo.canonical_url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn twitter"
                  aria-label="Share on Twitter"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(article.seo.canonical_url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn facebook"
                  aria-label="Share on Facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a 
                  href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(article.seo.canonical_url)}&title=${encodeURIComponent(article.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn linkedin"
                  aria-label="Share on LinkedIn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Back to Articles Button */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <Link to="/sandlot-insider" className="back-to-articles">
                ← Back to All Articles
              </Link>
            </div>
          </footer>

        {/* Related Posts Section - OUTSIDE footer, full width at bottom */}
        {article.related_posts && article.related_posts.length > 0 && (
          <div className="related-posts-section">
            <h3>📚 Related Articles</h3>
            <div className="related-posts-grid">
              {article.related_posts.map((relatedSlug, idx) => {
                const relatedArticle = articlesData.articles.find(a => a.slug === relatedSlug);
                return relatedArticle ? (
                  <Link 
                    key={idx}
                    to={`/sandlot-insider/${relatedArticle.slug}`}
                    className="related-post-card"
                  >
                    <div className="related-post-image">
                      <img 
                        src={relatedArticle.hero_image.url} 
                        alt={relatedArticle.hero_image.alt}
                      />
                    </div>
                    <div className="related-post-content">
                      <h4>{relatedArticle.title}</h4>
                      <p className="related-post-meta">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {relatedArticle.read_time_minutes} min read
                      </p>
                      <span className="read-more-arrow">Read More →</span>
                    </div>
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        )}

        </article>
      </div>
    </section>
  );
}

export default ArticlePost;