import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import contactImage from '../../../assets/images/spa-retro-logo-removebg.png';

function ContactPage() {

  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issueType: '',
    message: ''
  });
  const [captchaValue, setCaptchaValue] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!captchaValue) {
      setSubmitStatus({ type: 'error', message: 'Please complete the reCAPTCHA' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Replace with your actual API endpoint
      // const response = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...formData, captcha: captchaValue })
      // });

      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSubmitStatus({ 
        type: 'success', 
        message: 'Thank you! Your message has been sent successfully.' 
      });
      
      // Reset form
      setFormData({ name: '', email: '', issueType: '', message: '' });
      setCaptchaValue(null);

    setTimeout(() => {
      navigate('/contact');
    }, 2000);
      
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: 'Something went wrong. Please try again later.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="contact-page">
      <div className="container">
        <h1 className="page-title">Get In Touch</h1>
        <p className="page-subtitle">
          Have a question, found a bug, or need assistance? We're here to help!
        </p>

        <div className="contact-content">
          <div className="contact-form-container">
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="issueType">How can we help? *</label>
                <select
                  id="issueType"
                  name="issueType"
                  value={formData.issueType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select an option</option>
                  <option value="technical">Technical Issue</option>
                  <option value="bug">Report a Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="account">Account Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="predictions">Predictions/Analytics Question</option>
                  <option value="data">Data Accuracy Concern</option>
                  <option value="feedback">General Feedback</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Please provide as much detail as possible..."
                ></textarea>
              </div>

              <div className="form-group captcha-group">
                <ReCAPTCHA
                  sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY} // Replace with your actual site key
                  onChange={handleCaptchaChange}
                  theme="light"
                />
              </div>

              {submitStatus && (
                <div className={`submit-message ${submitStatus.type}`}>
                  {submitStatus.message}
                </div>
              )}

              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>

            <div className="contact-info">
              <p>Or reach us directly at:</p>
              <a href="mailto:sandlotpicksanalytics@gmail.com" className="email-link">
                sandlotpicksanalytics@gmail.com
              </a>
            </div>
          </div>

          <div className="contact-image-container">
            <img 
              src={contactImage} 
              alt="Sandlot Picks Analytics" 
              className="contact-image"
            />
            <div className="image-overlay-text">
              <h3>We're Here to Help</h3>
              <p>Our team typically responds within 24 hours</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactPage;