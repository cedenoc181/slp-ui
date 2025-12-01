/* Simple Express server to verify reCAPTCHA Enterprise tokens and accept contact form submissions. */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Use built-in fetch in modern Node; fall back to node-fetch if needed.
const fetch = (...args) =>
  import('node-fetch').then(({ default: fn }) => fn(...args));

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
  })
);

const RECAPTCHA_API_KEY = process.env.SANDLOT_APP_RECAPTCHA_API_KEY;
const RECAPTCHA_SITE_KEY = process.env.SANDLOT_APP_RECAPTCHA_SITE_KEY;
const PROJECT_ID = 'sandlot-picks-1762350728582';

const verifyRecaptcha = async ({ token, expectedAction = 'contact_submit' }) => {
  if (!token) {
    return { ok: false, message: 'Missing captcha token' };
  }
  if (!RECAPTCHA_API_KEY || !RECAPTCHA_SITE_KEY) {
    return { ok: false, message: 'Server missing reCAPTCHA configuration' };
  }

  const body = {
    event: {
      token,
      expectedAction,
      siteKey: RECAPTCHA_SITE_KEY,
    },
  };

  const resp = await fetch(
    `https://recaptchaenterprise.googleapis.com/v1/projects/${PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const detail = await resp.text();
    return { ok: false, message: 'ReCAPTCHA API error', detail };
  }

  const assessment = await resp.json();
  const tokenProps = assessment?.tokenProperties || {};
  const risk = assessment?.riskAnalysis || {};

  if (!tokenProps.valid || tokenProps.invalidReason) {
    return {
      ok: false,
      message: 'Invalid captcha token',
      detail: tokenProps.invalidReason || 'invalid',
    };
  }

  if (tokenProps.action && tokenProps.action !== expectedAction) {
    return {
      ok: false,
      message: 'Unexpected captcha action',
      detail: tokenProps.action,
    };
  }

  const score = typeof risk.score === 'number' ? risk.score : 0;
  if (score < 0.5) {
    return { ok: false, message: 'Captcha score too low', score };
  }

  return { ok: true, score };
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
