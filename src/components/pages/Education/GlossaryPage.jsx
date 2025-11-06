import { useState, useEffect } from 'react';
import glossaryData from '../../../data/glossary.json';


function GlossaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortedTerms, setSortedTerms] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get unique categories
  const categories = ['All', ...new Set(glossaryData.terms.map(term => term.category))];

  // Filter and sort terms
  useEffect(() => {
    let filtered = glossaryData.terms.filter(term => {
      const searchLower = searchTerm.toLowerCase();
      
      // If no search term, match all
      if (!searchTerm) {
        const matchesCategory = selectedCategory === 'All' || term.category === selectedCategory;
        return matchesCategory;
      }
      
      // Check if term starts with search (highest priority)
      const termStartsWith = term.term.toLowerCase().startsWith(searchLower);
      
      // Check if term contains search
      const termContains = term.term.toLowerCase().includes(searchLower);
      
      // Check if full name contains search
      const fullNameContains = term.fullName?.toLowerCase().includes(searchLower);
      
      // Check if definition contains search
      const definitionContains = term.definition.toLowerCase().includes(searchLower);
      
      const matchesSearch = termStartsWith || termContains || fullNameContains || definitionContains;
      const matchesCategory = selectedCategory === 'All' || term.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Sort with priority when searching
    if (searchTerm) {
      filtered.sort((a, b) => {
        const searchLower = searchTerm.toLowerCase();
        
        const aTermStarts = a.term.toLowerCase().startsWith(searchLower);
        const bTermStarts = b.term.toLowerCase().startsWith(searchLower);
        const aTermContains = a.term.toLowerCase().includes(searchLower);
        const bTermContains = b.term.toLowerCase().includes(searchLower);
        const aFullNameContains = a.fullName?.toLowerCase().includes(searchLower);
        const bFullNameContains = b.fullName?.toLowerCase().includes(searchLower);
        
        // Prioritize terms that start with search
        if (aTermStarts && !bTermStarts) return -1;
        if (!aTermStarts && bTermStarts) return 1;
        
        // Then terms that contain search
        if (aTermContains && !bTermContains) return -1;
        if (!aTermContains && bTermContains) return 1;
        
        // Then full names that contain search
        if (aFullNameContains && !bFullNameContains) return -1;
        if (!aFullNameContains && bFullNameContains) return 1;
        
        // Finally, alphabetically by term
        return a.term.localeCompare(b.term);
      });
    } else {
      // When not searching, just sort alphabetically
      filtered.sort((a, b) => a.term.localeCompare(b.term));
    }
    
    setSortedTerms(filtered);
  }, [searchTerm, selectedCategory]);

  // Group terms by first letter
  const groupedTerms = sortedTerms.reduce((acc, term) => {
    const firstLetter = term.term[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(term);
    return acc;
  }, {});

  const letters = Object.keys(groupedTerms).sort();

  // Scroll to letter section
  const scrollToLetter = (letter) => {
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="glossary-page">
      <div className="container">
        <h1 className="page-title">Baseball Analytics Glossary</h1>
        <p className="page-subtitle">
          Your comprehensive guide to understanding baseball statistics, advanced metrics, and betting terminology
        </p>

        {/* Search and Filter Controls */}
        <div className="glossary-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search terms, definitions..."
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

        {/* Alphabet Navigation */}
        {!searchTerm && selectedCategory === 'All' && (
          <div className="alphabet-nav">
            {letters.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className="letter-btn"
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Results Count */}
        <div className="results-info">
          <p>Showing {sortedTerms.length} term{sortedTerms.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Glossary Terms */}
        {sortedTerms.length > 0 ? (
          <div className="glossary-content">
            {letters.map(letter => (
              <div key={letter} id={`letter-${letter}`} className="letter-section">
                <h2 className="letter-heading">{letter}</h2>
                <div className="terms-list">
                  {groupedTerms[letter].map(term => (
                    <div key={term.id} className="term-card">
                      <div className="term-header">
                        <h3 className="term-name">{term.term}</h3>
                        <span className="term-category">{term.category}</span>
                      </div>
                      {term.fullName && (
                        <p className="term-full-name">{term.fullName}</p>
                      )}
                      <p className="term-definition">{term.definition}</p>
                      {term.formula && (
                        <div className="term-formula">
                          <strong>Formula:</strong> <code>{term.formula}</code>
                        </div>
                      )}
                      {term.example && (
                        <div className="term-example">
                          <strong>Example:</strong> {term.example}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No terms found matching your search criteria.</p>
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
      </div>
    </section>
  );
}

export default GlossaryPage;