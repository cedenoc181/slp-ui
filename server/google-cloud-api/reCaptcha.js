/* Simple Express server to verify reCAPTCHA Enterprise tokens and accept contact form submissions. */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Use built-in fetch in modern Node; fall back to node-fetch if needed.
const fetch = (...args) =>
  import('node-fetch').then(({ default: fn }) => fn(...args));

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
  })
);

const RECAPTCHA_SECRET = process.env.SANDLOT_APP_RECAPTCHA_SECRET;

const verifyRecaptcha = async ({ token, expectedAction = 'contact_submit' }) => {
  if (!token) {
    return { ok: false, message: 'Missing captcha token' };
  }
  if (!RECAPTCHA_SECRET) {
    return { ok: false, message: 'Server missing reCAPTCHA secret' };
  }

  const params = new URLSearchParams();
  params.append('secret', RECAPTCHA_SECRET);
  params.append('response', token);

  const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return { ok: false, message: 'ReCAPTCHA verify error', detail };
  }

  const result = await resp.json();
  if (!result.success) {
    return {
      ok: false,
      message: 'Invalid captcha token',
      detail: (result['error-codes'] || []).join(', ') || 'invalid',
    };
  }

  if (result.action && result.action !== expectedAction) {
    return {
      ok: false,
      message: 'Unexpected captcha action',
      detail: result.action,
    };
  }

  return { ok: true, score: result.score };
};

app.post('/api/contact', async (req, res) => {
  try {
    const { captchaToken, expectedAction = 'contact_submit', ...formData } = req.body || {};
    const verification = await verifyRecaptcha({ token: captchaToken, expectedAction });
    if (!verification.ok) {
      return res.status(400).json({ success: false, ...verification });
    }

    // TODO: Handle formData (send email, store in DB, etc.)
    return res.json({ success: true, score: verification.score });
  } catch (err) {
    console.error('Contact submit error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`reCAPTCHA contact server listening on port ${port}`);
});
