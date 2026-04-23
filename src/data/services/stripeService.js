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
   * plan: 'monthly' | 'weekly' | 'day_pass'
   * Returns { checkout_url } — redirect user to Stripe Checkout.
   */
  createCheckoutSession({ plan = 'monthly', successUrl, cancelUrl } = {}) {
    return subFetch('/api/v1/subscriptions/checkout/stripe', {
      method: 'POST',
      body: {
        plan,
        success_url: successUrl || `https://www.sandlotpicks.com/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
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
   * POST /api/v1/subscriptions/change-plan
   * plan: 'monthly' | 'weekly'
   * Prorates immediately on Stripe. Blocked for Whop users and cancelled subs.
   */
  changePlan(plan) {
    return subFetch('/api/v1/subscriptions/change-plan', {
      method: 'POST',
      body: { plan },
    });
  },

  /**
   * POST /api/v1/subscriptions/redeem-promo
   * Redeem a promo code (e.g. 'FREE7'). Backend validates the code, checks
   * the user hasn't already redeemed, and returns a Stripe checkout URL
   * with the discount pre-applied. Redirect the browser to checkout_url.
   *
   * 400 detail strings to surface to the user:
   *   - "Promo code is invalid or no longer active."
   *   - "You've already redeemed a promotional code."
   *   - "You already have an active premium subscription."
   *
   * @param {string} code
   * @returns {Promise<{ checkout_url: string }>}
   */
  redeemPromo(code) {
    return subFetch('/api/v1/subscriptions/redeem-promo', {
      method: 'POST',
      body: { code },
    });
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
