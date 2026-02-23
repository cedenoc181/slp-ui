import { useSearchParams, Link } from 'react-router-dom';

function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const content = {
    success: {
      icon: '✅',
      heading: "You've been unsubscribed",
      message: "You've been successfully removed from the Sandlot Picks waitlist. You won't receive any more emails from us.",
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
