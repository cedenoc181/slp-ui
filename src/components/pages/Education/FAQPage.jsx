import { useState, useEffect } from 'react';
import faqData from '../../../data/faqs.json';


function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get unique categories
  const categories = ['All', ...new Set(faqData.faqs.map(faq => faq.category))];

  // Filter FAQs
  const filteredFaqs = faqData.faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group FAQs by category
  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {});

  const categoriesWithFaqs = Object.keys(groupedFaqs).sort();

  // Toggle FAQ expansion
  const toggleFaq = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) 
        ? prev.filter(expandedId => expandedId !== id)
        : [...prev, id]
    );
  };

  // Expand all in category
  const expandCategory = (category) => {
    const categoryFaqIds = groupedFaqs[category].map(faq => faq.id);
    const allExpanded = categoryFaqIds.every(id => expandedIds.includes(id));
    
    if (allExpanded) {
      setExpandedIds(prev => prev.filter(id => !categoryFaqIds.includes(id)));
    } else {
      setExpandedIds(prev => [...new Set([...prev, ...categoryFaqIds])]);
    }
  };

  return (
    <section className="faq-page">
      <div className="container">
        <h1 className="page-title">Frequently Asked Questions</h1>
        <p className="page-subtitle">
          Find answers to common questions about Sandlot Picks Analytics, our predictions, and how to use our platform
        </p>

        {/* Search and Filter Controls */}
        <div className="faq-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="category-filter">
            <label htmlFor="category">Filter by Category:</label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="results-info">
          <p>Showing {filteredFaqs.length} question{filteredFaqs.length !== 1 ? 's' : ''}</p>
        </div>

        {/* FAQ Content */}
        {filteredFaqs.length > 0 ? (
          <div className="faq-content">
            {categoriesWithFaqs.map(category => (
              <div key={category} className="faq-category-section">
                <div className="category-header">
                  <h2 className="category-title">{category}</h2>
                  <button 
                    onClick={() => expandCategory(category)}
                    className="expand-all-btn"
                  >
                    {groupedFaqs[category].every(faq => expandedIds.includes(faq.id)) 
                      ? 'Collapse All' 
                      : 'Expand All'}
                  </button>
                </div>

                <div className="faq-list">
                  {groupedFaqs[category].map(faq => (
                    <div 
                      key={faq.id} 
                      className={`faq-item ${expandedIds.includes(faq.id) ? 'expanded' : ''}`}
                    >
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        className="faq-question"
                        aria-expanded={expandedIds.includes(faq.id)}
                      >
                        <span className="question-text">{faq.question}</span>
                        <span className="toggle-icon">
                          {expandedIds.includes(faq.id) ? '−' : '+'}
                        </span>
                      </button>
                      
                      <div className={`faq-answer ${expandedIds.includes(faq.id) ? 'show' : ''}`}>
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No questions found matching your search criteria.</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
              }}
              className="reset-btn"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Contact CTA */}
        <div className="faq-cta">
          <h3>Still have questions?</h3>
          <p>Can't find what you're looking for? We're here to help!</p>
          <a href="/contact" className="contact-btn">Contact Us</a>
        </div>
      </div>
    </section>
  );
}

export default FAQPage;