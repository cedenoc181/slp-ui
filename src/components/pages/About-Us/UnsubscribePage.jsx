import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { unsubscribe } from '../../../data/services/campaignsService';

function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  // Allow ?status=success/invalid/error to short-circuit the POST for legacy email links.
  const initialStatus = searchParams.get('status');

  const [status, setStatus] = useState(initialStatus || (token ? 'processing' : 'invalid'));

  useEffect(() => {
    if (initialStatus || !token) return;
    let cancelled = false;
    unsubscribe(token)
      .then(() => { if (!cancelled) setStatus('success'); })
      .catch(err => {
        if (cancelled) return;
        const msg = (err?.message || '').toLowerCase();
        setStatus(msg.includes('invalid') || msg.includes('expired') ? 'invalid' : 'error');
      });
    return () => { cancelled = true; };
  }, [token, initialStatus]);

  const content = {
    processing: {
      icon: '⏳',
      heading: 'Processing your request…',
      message: "Hang on while we update your preferences.",
    },
    success: {
      icon: '✅',
      heading: "You've been unsubscribed",
      message: "You won't receive any more email updates from Sandlot Picks. You can re-enable email updates any time from your account settings.",
    },
    invalid: {
      icon: '⚠️',
      heading: 'Invalid unsubscribe link',
      message: 'This unsubscribe link is invalid or has already been used.',
    },
    error: {
      icon: '❌',
      heading: 'Something went wrong',
      message: 'We were unable to process your unsubscribe request. Please try again or contact us directly.',
    },
  };

  const { icon, heading, message } = content[status] || content.invalid;

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
        <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#041e42' }}>{heading}</h1>
        <p style={{ fontSize: '15px', color: '#6b7690', lineHeight: '1.6', marginBottom: '28px' }}>{message}</p>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#041e42',
            color: '#fff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '14px',
          }}
        >
          Back to Sandlot Picks
        </Link>
      </div>
    </div>
  );
}

export default UnsubscribePage;
