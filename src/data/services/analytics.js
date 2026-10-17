import ReactGA from 'react-ga4';

// ---------------------------------------------------------------------------
// GA4 analytics
// ---------------------------------------------------------------------------
// AnalyticsTracker (src/App.jsx) sends a manual pageview on every route
// change, so GA's own automatic page_view is turned off here to avoid
// double-counting.
// ---------------------------------------------------------------------------
const GA_MEASUREMENT_ID = 'G-SYNN1KZYYW';

let _initialized = false;

/**
 * Initialize GA4. No-ops on localhost/127.0.0.1, during the react-snap
 * prerender crawl, or when REACT_APP_GA_DISABLED is set — so local dev and
 * the static prerender never send real hits.
 * Append ?debug_mode=true to the URL to route hits into GA4 DebugView.
 */
export function initAnalytics() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return;
  if (navigator.userAgent.includes('ReactSnap')) return;
  if (process.env.REACT_APP_GA_DISABLED === 'true') return;

  const gtagOptions = { send_page_view: false };
  if (new URLSearchParams(window.location.search).get('debug_mode') === 'true') {
    gtagOptions.debug_mode = true;
  }

  ReactGA.initialize(GA_MEASUREMENT_ID, { gtagOptions });
  _initialized = true;
}

/**
 * Send a pageview. No-ops when analytics wasn't initialized.
 * @param {string} path - pathname + search
 * @param {string} [title] - document title for this page
 */
export function trackPageview(path, title) {
  if (!_initialized) return;
  ReactGA.send({ hitType: 'pageview', page: path, title });
}

/**
 * Send a custom GA4 event. No-ops when analytics wasn't initialized.
 * @param {string} name - GA4 event name, e.g. 'generate_lead'
 * @param {Object} [params] - event parameters
 */
export function trackEvent(name, params = {}) {
  if (!_initialized) return;
  ReactGA.event(name, params);
}
