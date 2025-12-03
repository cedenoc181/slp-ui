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

const RECAPTCHA_SECRET =
  process.env.SANDLOT_APP_RECAPTCHA_SECRET ||
  process.env.RECAPTCHA_SECRET ||
  process.env.RECAPTCHA_SECRET_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.SENDGRID_TO_EMAIL;
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@sandlotpicks.com';

const verifyRecaptcha = async ({ token, expectedAction = 'contact_submit' }) => {
  if (!token) {
    return { ok: false, message: 'Missing captcha token' };
  }
  if (!RECAPTCHA_SECRET) {
    return {
      ok: false,
      message: 'Server missing reCAPTCHA secret',
      detail: 'Set SANDLOT_APP_RECAPTCHA_SECRET (or RECAPTCHA_SECRET)',
    };
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

const sendContactEmail = async (formData) => {
  if (!SENDGRID_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.warn('SendGrid not configured, skipping email send');
    return { sent: false, error: 'SendGrid not configured' };
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: CONTACT_TO_EMAIL }],
      },
    ],
    from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks Contact' },
    subject: `Contact Form: ${formData.issueType || 'General'}`,
    content: [
      {
        type: 'text/plain',
        value: `Name: ${formData.name || 'N/A'}
Email: ${formData.email || 'N/A'}
Issue: ${formData.issueType || 'N/A'}

Message:
${formData.message || ''}`,
      },
    ],
  };

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`SendGrid error ${resp.status}: ${detail}`);
  }

  return { sent: true };
};

app.post('/api/contact', async (req, res) => {
  try {
    const { captchaToken, expectedAction = 'contact_submit', ...formData } = req.body || {};
    const verification = await verifyRecaptcha({ token: captchaToken, expectedAction });
    if (!verification.ok) {
      return res.status(400).json({ success: false, ...verification });
    }

    let emailResult = { sent: false };
    try {
      emailResult = await sendContactEmail(formData);
    } catch (err) {
      console.error('Contact email send error', err);
      emailResult = { sent: false, error: err.message };
    }

    return res.json({
      success: true,
      score: verification.score,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    });
  } catch (err) {
    console.error('Contact submit error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`reCAPTCHA contact server listening on port ${port}`);
});
