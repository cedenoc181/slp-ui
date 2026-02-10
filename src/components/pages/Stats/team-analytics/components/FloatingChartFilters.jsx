import React from 'react';

/**
 * Floating chart filter buttons (Combined/Home/Away)
 */
function FloatingChartFilters({
  chartFilter,
  handleChartFilterChange,
  isFilterChanging,
  shouldHideFloatingFilters,
}) {
  return (
    <div className={`chart-filters floating-remote ${shouldHideFloatingFilters ? 'floating-hidden' : ''} ${isFilterChanging ? 'changing' : ''}`}>
      <button 
        className={`chart-filter-btn ${chartFilter === 'season' ? 'active' : ''}`} 
        onClick={() => handleChartFilterChange('season')}
        disabled={isFilterChanging}
        aria-disabled={isFilterChanging}
      >
        <span className="filter-icon">📊</span> Combined
      </button>
      <button 
        className={`chart-filter-btn ${chartFilter === 'home' ? 'active' : ''}`} 
        onClick={() => handleChartFilterChange('home')}
        disabled={isFilterChanging}
        aria-disabled={isFilterChanging}
      >
        <span className="filter-icon">🏠</span> Home
      </button>
      <button 
        className={`chart-filter-btn ${chartFilter === 'away' ? 'active' : ''}`} 
        onClick={() => handleChartFilterChange('away')}
        disabled={isFilterChanging}
        aria-disabled={isFilterChanging}
      >
        <span className="filter-icon">✈️</span> Away
      </button>
    </div>
  );
}

export default FloatingChartFilters;
