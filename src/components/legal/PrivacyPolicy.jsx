import { useEffect } from 'react';

function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="legal-content">
          <section className="intro-section">
            <p>
              Sandlot Picks Analytics ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
            <p>
              <strong>By using our services, you consent to the data practices described in this policy.</strong>
            </p>
          </section>

          <section>
            <h2>1. Information We Collect</h2>
            
            <h3>1.1 Personal Information</h3>
            <p>We may collect personal information that you voluntarily provide to us when you:</p>
            <ul>
              <li>Register for an account</li>
              <li>Subscribe to our services</li>
              <li>Sign up for our newsletter</li>
              <li>Contact us via email or support forms</li>
              <li>Participate in surveys or promotions</li>
            </ul>
            <p>This information may include:</p>
            <ul>
              <li>Name and email address</li>
              <li>Username and password</li>
              <li>Payment information (processed securely through third-party payment processors)</li>
              <li>Age verification information</li>
              <li>Communication preferences</li>
            </ul>

            <h3>1.2 Automatically Collected Information</h3>
            <p>When you access our website, we automatically collect certain information, including:</p>
            <ul>
              <li>IP address and location data</li>
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>Device information</li>
              <li>Pages visited and time spent on pages</li>
              <li>Referring website addresses</li>
              <li>Click patterns and navigation paths</li>
            </ul>

            <h3>1.3 Cookies and Tracking Technologies</h3>
            <p>We use cookies, web beacons, and similar tracking technologies to:</p>
            <ul>
              <li>Remember your preferences and settings</li>
              <li>Analyze website traffic and user behavior</li>
              <li>Improve our services and user experience</li>
              <li>Deliver personalized content</li>
              <li>Track marketing campaign effectiveness</li>
            </ul>
            <p>You can control cookie settings through your browser, but disabling cookies may limit functionality.</p>

            <h3>1.4 Analytics and Usage Data</h3>
            <p>We collect data about how you use our services, including:</p>
            <ul>
              <li>Features and tools accessed</li>
              <li>Predictions viewed and saved</li>
              <li>Search queries and filters used</li>
              <li>Time spent using various features</li>
              <li>Interaction with analytics and visualizations</li>
            </ul>
          </section>

          <section>
            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>

            <h3>2.1 Service Delivery</h3>
            <ul>
              <li>Provide and maintain our analytics platform</li>
              <li>Process your subscription and payments</li>
              <li>Deliver personalized predictions and insights</li>
              <li>Send important service updates and notifications</li>
              <li>Provide customer support</li>
            </ul>

            <h3>2.2 Service Improvement</h3>
            <ul>
              <li>Analyze usage patterns to improve our algorithms</li>
              <li>Develop new features and services</li>
              <li>Conduct research and analytics</li>
              <li>Test and optimize website performance</li>
              <li>Enhance user experience and interface</li>
            </ul>

            <h3>2.3 Communication</h3>
            <ul>
              <li>Send newsletters and promotional materials (with your consent)</li>
              <li>Respond to your inquiries and requests</li>
              <li>Send administrative information about your account</li>
              <li>Notify you of changes to our services or policies</li>
            </ul>

            <h3>2.4 Security and Compliance</h3>
            <ul>
              <li>Verify your identity and age</li>
              <li>Prevent fraud and unauthorized access</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms and Conditions</li>
              <li>Protect our rights and property</li>
            </ul>

            <h3>2.5 Analytics and Research</h3>
            <ul>
              <li>Create aggregated, anonymized statistics about usage patterns</li>
              <li>Improve our predictive models and algorithms</li>
              <li>Understand user preferences and betting trends</li>
              <li>Generate insights for content creation</li>
            </ul>
          </section>

          <section>
            <h2>3. Information Sharing and Disclosure</h2>
            
            <h3>3.1 We Do NOT Sell Your Personal Information</h3>
            <p className="important-notice">
              We do not sell, rent, or trade your personal information to third parties for marketing purposes.
            </p>

            <h3>3.2 Service Providers</h3>
            <p>We may share your information with trusted third-party service providers who assist us in:</p>
            <ul>
              <li>Payment processing (e.g., Stripe, PayPal)</li>
              <li>Email delivery and marketing (e.g., Mailchimp, SendGrid)</li>
              <li>Analytics and tracking (e.g., Google Analytics)</li>
              <li>Cloud hosting and data storage</li>
              <li>Customer support tools</li>
            </ul>
            <p>These providers are contractually obligated to protect your information and use it only for specified purposes.</p>

            <h3>3.3 Legal Requirements</h3>
            <p>We may disclose your information if required by law or in response to:</p>
            <ul>
              <li>Court orders or legal processes</li>
              <li>Government or regulatory requests</li>
              <li>Requests to protect our legal rights</li>
              <li>Prevention of fraud or illegal activity</li>
              <li>Protection of user safety</li>
            </ul>

            <h3>3.4 Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of assets, your information may be transferred. We will provide notice before your information is transferred and becomes subject to a different privacy policy.
            </p>

            <h3>3.5 Aggregated Data</h3>
            <p>
              We may share aggregated, anonymized data that cannot identify you personally for research, marketing, or analytical purposes.
            </p>
          </section>

          <section>
            <h2>4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information:</p>
            <ul>
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure password hashing and storage</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
              <li>Firewall protection and intrusion detection</li>
              <li>Regular backups and disaster recovery plans</li>
            </ul>
            <p className="important-notice">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>We retain your information for as long as necessary to:</p>
            <ul>
              <li>Provide our services to you</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes and enforce agreements</li>
              <li>Maintain business records</li>
            </ul>
            <p>
              When you close your account, we will delete or anonymize your personal information within a reasonable timeframe, unless we are required to retain it for legal or legitimate business purposes.
            </p>
          </section>

          <section>
            <h2>6. Your Rights and Choices</h2>
            
            <h3>6.1 Access and Update</h3>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Update or correct inaccurate information</li>
              <li>Request a copy of your data</li>
            </ul>

            <h3>6.2 Delete Your Account</h3>
            <p>
              You may request deletion of your account and associated data by contacting us at sandlotpicksanalytics@gmail.com. Some information may be retained for legal or operational purposes.
            </p>

            <h3>6.3 Marketing Communications</h3>
            <p>
              You can opt out of marketing emails by clicking the "unsubscribe" link in any promotional email or by updating your preferences in your account settings.
            </p>

            <h3>6.4 Cookie Management</h3>
            <p>
              You can control cookies through your browser settings. Note that disabling cookies may affect website functionality.
            </p>

            <h3>6.5 Do Not Track</h3>
            <p>
              Our website does not currently respond to "Do Not Track" signals from browsers.
            </p>
          </section>

          <section>
            <h2>7. Third-Party Services and Links</h2>
            <p>
              Our website may contain links to third-party websites, including social media platforms and partner sites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
            </p>
            
            <h3>7.1 Google Analytics</h3>
            <p>
              We use Google Analytics to analyze website traffic. Google Analytics uses cookies to collect anonymous information. You can opt out using the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.
            </p>

            <h3>7.2 Social Media</h3>
            <p>
              Our website includes social media features (Twitter, Discord, Instagram, Threads). These features may collect your IP address and set cookies. Social media features are governed by the privacy policies of the respective platforms.
            </p>
          </section>

          <section>
            <h2>8. Children's Privacy</h2>
            <p className="important-notice">
              Our services are not intended for individuals under 21 years of age (or the legal gambling age in your jurisdiction). We do not knowingly collect personal information from minors.
            </p>
            <p>
              If we discover that we have collected information from a minor, we will delete it immediately. If you believe we have information from a minor, please contact us at sandlotpicksanalytics@gmail.com.
            </p>
          </section>

          <section>
            <h2>9. California Privacy Rights (CCPA)</h2>
            <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act:</p>
            <ul>
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt out of the sale of personal information (we do not sell your information)</li>
              <li>Right to request deletion of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>
            <p>
              To exercise these rights, contact us at sandlotpicksanalytics@gmail.com.
            </p>
          </section>

          <section>
            <h2>10. European Privacy Rights (GDPR)</h2>
            <p>If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation:</p>
            <ul>
              <li>Right to access your personal data</li>
              <li>Right to rectification of inaccurate data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent</li>
            </ul>
            <p>
              To exercise these rights, contact us at sandlotpicksanalytics@gmail.com.
            </p>
          </section>

          <section>
            <h2>11. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our services, you consent to the transfer of your information to these countries.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes by:
            </p>
            <ul>
              <li>Posting the updated policy on our website</li>
              <li>Updating the "Last Updated" date</li>
              <li>Sending an email notification (for significant changes)</li>
            </ul>
            <p>
              Your continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>
              If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <p>
              <strong>Email:</strong> sandlotpicksanalytics@gmail.com<br />
              <strong>Website:</strong> www.sandlotpicks.com
            </p>
            <p>
              We will respond to your inquiry within a reasonable timeframe, typically within 30 days.
            </p>
          </section>

          <section>
            <h2>14. Consent</h2>
            <p>
              By using our website and services, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and disclosure of your information as described herein.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;