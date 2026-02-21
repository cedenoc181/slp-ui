/* Simple Express server to verify reCAPTCHA Enterprise tokens and accept contact form submissions. */
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Use built-in fetch in modern Node; fall back to node-fetch if needed.
const fetch = (...args) =>
  import('node-fetch').then(({ default: fn }) => fn(...args));

const app = express();
app.use(express.json());

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'https://www.sandlotpicks.com',
  'https://sandlotpicks.com',
  'https://www.sandlotpicksanalytics.com',
  'https://sandlotpicksanalytics.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // If CLIENT_ORIGIN is set and matches, allow it
      if (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

const RECAPTCHA_SECRET =
  process.env.SANDLOT_APP_RECAPTCHA_SECRET ||
  process.env.RECAPTCHA_SECRET ||
  process.env.RECAPTCHA_SECRET_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_TEMPLATE_ID = process.env.SENDGRID_TEMPLATE_ID; // Contact form admin notification
const SENDGRID_CONTACT_USER_TEMPLATE_ID = process.env.SENDGRID_CONTACT_USER_TEMPLATE_ID; // Contact form user confirmation
// Waitlist email templates
const SENDGRID_WAITLIST_USER_TEMPLATE_ID = process.env.SENDGRID_WAITLIST_USER_TEMPLATE_ID; // Confirmation email to user
const SENDGRID_WAITLIST_ADMIN_TEMPLATE_ID = process.env.SENDGRID_WAITLIST_ADMIN_TEMPLATE_ID; // Notification email to admin
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || process.env.SENDGRID_TO_EMAIL; // Also used for waitlist admin notifications
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@sandlotpicks.com';

// Waitlist storage file
const WAITLIST_FILE = path.join(__dirname, 'waitlist-emails.json');

// Read waitlist emails from file
const getWaitlistEmails = () => {
  try {
    if (fs.existsSync(WAITLIST_FILE)) {
      const data = fs.readFileSync(WAITLIST_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading waitlist file:', err);
  }
  return [];
};

// Save email to waitlist file
const addToWaitlist = (email) => {
  const emails = getWaitlistEmails();
  const normalizedEmail = email.toLowerCase().trim();
  
  if (emails.some(entry => entry.email === normalizedEmail)) {
    return { added: false, reason: 'duplicate' };
  }
  
  emails.push({
    email: normalizedEmail,
    signedUpAt: new Date().toISOString()
  });
  
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(emails, null, 2));
  return { added: true };
};

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

  const usesTemplate = Boolean(SENDGRID_TEMPLATE_ID);

  const payload = usesTemplate
    ? {
        personalizations: [
          {
            to: [{ email: CONTACT_TO_EMAIL }],
            dynamic_template_data: {
              name: formData.name || 'N/A',
              email: formData.email || 'N/A',
              issueType: formData.issueType || 'General',
              message: formData.message || '',
            },
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks Contact' },
        template_id: SENDGRID_TEMPLATE_ID,
      }
    : {
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

// Send contact form confirmation email to user
const sendContactUserEmail = async (formData) => {
  if (!SENDGRID_API_KEY || !CONTACT_FROM_EMAIL || !formData.email) {
    console.warn('SendGrid not configured or no user email, skipping contact user email');
    return { sent: false, error: 'Email not configured' };
  }

  const usesTemplate = Boolean(SENDGRID_CONTACT_USER_TEMPLATE_ID);

  const payload = usesTemplate
    ? {
        personalizations: [
          {
            to: [{ email: formData.email }],
            dynamic_template_data: {
              name: formData.name || 'there',
              issueType: formData.issueType || 'General',
            },
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks' },
        template_id: SENDGRID_CONTACT_USER_TEMPLATE_ID,
      }
    : {
        personalizations: [
          {
            to: [{ email: formData.email }],
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks' },
        subject: "We've received your message!",
        content: [
          {
            type: 'text/html',
            value: `
              <h2>Thanks for reaching out, ${formData.name || 'there'}!</h2>
              <p>We've received your message regarding: <strong>${formData.issueType || 'General Inquiry'}</strong></p>
              <p>Our team will review your submission and get back to you as soon as possible.</p>
              <p>Best regards,<br>The Sandlot Picks Team</p>
            `,
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
    throw new Error(`SendGrid contact user email error ${resp.status}: ${detail}`);
  }

  return { sent: true };
};

// Send waitlist confirmation email to user
const sendWaitlistUserEmail = async (email) => {
  if (!SENDGRID_API_KEY || !CONTACT_FROM_EMAIL) {
    console.warn('SendGrid not configured, skipping waitlist user email');
    return { sent: false, error: 'SendGrid not configured' };
  }

  const usesTemplate = Boolean(SENDGRID_WAITLIST_USER_TEMPLATE_ID);

  const payload = usesTemplate
    ? {
        personalizations: [
          {
            to: [{ email }],
            dynamic_template_data: {
              email: email,
            },
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks' },
        template_id: SENDGRID_WAITLIST_USER_TEMPLATE_ID,
      }
    : {
        personalizations: [
          {
            to: [{ email }],
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks' },
        subject: "You're on the Sandlot Picks Waitlist!",
        content: [
          {
            type: 'text/html',
            value: `
              <h2>Welcome to the Sandlot Picks Waitlist!</h2>
              <p>Thanks for signing up! You'll be among the first to know when our AI-powered MLB predictions go live for the 2026 season.</p>
              <p>Stay tuned for updates!</p>
              <p>- The Sandlot Picks Team</p>
            `,
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
    throw new Error(`SendGrid user email error ${resp.status}: ${detail}`);
  }

  return { sent: true };
};

// Send waitlist notification email to admin
const sendWaitlistAdminEmail = async (userEmail) => {
  if (!SENDGRID_API_KEY || !CONTACT_FROM_EMAIL || !CONTACT_TO_EMAIL) {
    console.warn('SendGrid or admin email not configured, skipping admin notification');
    return { sent: false, error: 'Admin email not configured' };
  }

  const usesTemplate = Boolean(SENDGRID_WAITLIST_ADMIN_TEMPLATE_ID);

  const payload = usesTemplate
    ? {
        personalizations: [
          {
            to: [{ email: CONTACT_TO_EMAIL }],
            dynamic_template_data: {
              email: userEmail,
              signedUpAt: new Date().toISOString(),
            },
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks Waitlist' },
        template_id: SENDGRID_WAITLIST_ADMIN_TEMPLATE_ID,
      }
    : {
        personalizations: [
          {
            to: [{ email: CONTACT_TO_EMAIL }],
          },
        ],
        from: { email: CONTACT_FROM_EMAIL, name: 'Sandlot Picks Waitlist' },
        subject: `New Waitlist Signup: ${userEmail}`,
        content: [
          {
            type: 'text/html',
            value: `
              <h2>New Waitlist Signup!</h2>
              <p><strong>Email:</strong> ${userEmail}</p>
              <p><strong>Signed up at:</strong> ${new Date().toLocaleString()}</p>
            `,
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
    throw new Error(`SendGrid admin email error ${resp.status}: ${detail}`);
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

    // Send notification email to admin
    let adminEmailResult = { sent: false };
    try {
      adminEmailResult = await sendContactEmail(formData);
    } catch (err) {
      console.error('Contact admin email send error', err);
      adminEmailResult = { sent: false, error: err.message };
    }

    // Send confirmation email to user
    let userEmailResult = { sent: false };
    try {
      userEmailResult = await sendContactUserEmail(formData);
    } catch (err) {
      console.error('Contact user email send error', err);
      userEmailResult = { sent: false, error: err.message };
    }

    return res.json({
      success: true,
      score: verification.score,
      adminEmailSent: adminEmailResult.sent,
      userEmailSent: userEmailResult.sent,
    });
  } catch (err) {
    console.error('Contact submit error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Waitlist signup endpoint (no reCAPTCHA required)
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email } = req.body || {};
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Check for duplicate and add to waitlist
    const addResult = addToWaitlist(email);
    if (!addResult.added) {
      return res.status(409).json({ 
        success: false, 
        message: 'This email is already on the waitlist' 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Send confirmation email to user
    let userEmailResult = { sent: false };
    try {
      userEmailResult = await sendWaitlistUserEmail(normalizedEmail);
    } catch (err) {
      console.error('Waitlist user email send error:', err);
      userEmailResult = { sent: false, error: err.message };
    }

    // Send notification email to admin
    let adminEmailResult = { sent: false };
    try {
      adminEmailResult = await sendWaitlistAdminEmail(normalizedEmail);
    } catch (err) {
      console.error('Waitlist admin email send error:', err);
      adminEmailResult = { sent: false, error: err.message };
    }

    return res.json({
      success: true,
      message: "You're on the list!",
      userEmailSent: userEmailResult.sent,
      adminEmailSent: adminEmailResult.sent,
    });
  } catch (err) {
    console.error('Waitlist submit error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`reCAPTCHA contact server listening on port ${port}`);
});