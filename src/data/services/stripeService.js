import { getAccessToken } from './userAuthService';
import { API_BASE_URL } from '../config/apiConfig';

// Internal fetch helper — supports GET and POST
async function subFetch(endpoint, { method = 'GET', body = null } = {}) {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed (${res.status})`);
  }
  return data;
}

const stripeService = {
  /**
   * POST /api/v1/subscriptions/checkout/stripe
   * Returns { checkout_url } — redirect user to Stripe Checkout.
   */
  createCheckoutSession({ successUrl, cancelUrl } = {}) {
    return subFetch('/api/v1/subscriptions/checkout/stripe', {
      method: 'POST',
      body: {
        success_url: successUrl || 'https://www.sandlotpicks.com/subscription/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  cancelUrl  || `${window.location.origin}/upgrade`,
      },
    });
  },

  /**
   * GET /api/v1/subscriptions/portal
   * Returns { portal_url } — redirect Stripe subscribers to manage billing.
   */
  getPortalUrl() {
    return subFetch('/api/v1/subscriptions/portal');
  },

  /**
   * GET /api/v1/subscriptions/me
   * Returns { subscription_tier, subscription_status, payment_source,
   *           subscription_expires_at, is_premium }
   */
  getSubscription() {
    return subFetch('/api/v1/subscriptions/me');
  },
};

export default stripeService;
