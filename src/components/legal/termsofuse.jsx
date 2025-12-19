import { useEffect } from 'react';
import '../../styles/legal.css';

function TermsOfUse() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <div className="container">
        <h1>Terms and Conditions</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="legal-content">
          <section className="intro-section">
            <p className="important-notice">
              THESE TERMS AND CONDITIONS ARE A LEGAL AGREEMENT BETWEEN SANDLOT PICKS ANALYTICS ("SANDLOT PICKS," "WE," "US" OR "OUR") AND YOURSELF ("YOU"). BY VISITING THE SITE, ACCESSING OR USING THESE SERVICES, INFORMATION, CONTENT, FEATURE, PRODUCT OR APPLICATION MADE AVAILABLE AT SANDLOTPICKS.COM ("SITE") AND/OR ANY RELEVANT SOFTWARE ("SOFTWARE") (COLLECTIVELY, "SERVICES"), YOU AGREE THAT YOU HAVE READ, UNDERSTOOD, ACCEPT AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS. IF YOU DO NOT AGREE TO THESE TERMS AND CONDITIONS, DO NOT USE ANY OF THE SERVICES PROVIDED.
            </p>
          </section>

          <section>
            <h2>1. Nature of Services</h2>
            <p>
              Sandlot Picks provides sports analytics, data-driven insights, and predictive modeling for sports betting. These analytics are used for educational and informational purposes only. Our Services include:
            </p>
            <ul>
              <li>Statistical analysis and sports data visualization</li>
              <li>Predictive models based on historical sports data</li>
              <li>Performance metrics and trends analysis</li>
              <li>Educational content about sports analytics and betting</li>
            </ul>
            <p>
              <strong>The Services are provided for informational and educational purposes only and are NOT intended as betting advice, financial advice, or a guarantee of outcomes.</strong>
            </p>
          </section>

          <section>
            <h2>2. Important Disclaimers</h2>
            
            <h3>2.1 No Investment or Betting Advice</h3>
            <p>
              Sandlot Picks is NOT a licensed betting advisor, financial advisor, or gambling consultant. Nothing on this Site constitutes:
            </p>
            <ul>
              <li>A recommendation to place any specific bet or wager</li>
              <li>A guarantee of winning outcomes or profitability</li>
              <li>Professional gambling advice or insider information</li>
              <li>An endorsement of any betting strategy or system</li>
            </ul>

            <h3>2.2 Past Performance Not Indicative of Future Results</h3>
            <p>
              All analytics, predictions, and models are based on historical data and statistical analysis. <strong>Past performance is not indicative of future results.</strong> Sports outcomes are inherently unpredictable, and no analytical model can guarantee accuracy.
            </p>

            <h3>2.3 Data Accuracy</h3>
            <p>
              While we strive for accuracy, the Services may contain errors, inaccuracies, outdated information, or incomplete data. We do not guarantee:
            </p>
            <ul>
              <li>The accuracy, completeness, or timeliness of any data</li>
              <li>That the Site or Services will be error-free or uninterrupted</li>
              <li>That predictions or analytics will be correct</li>
              <li>The performance of third-party data sources we rely upon</li>
            </ul>
          </section>

          <section>
            <h2>3. User Acknowledgment and Responsibility</h2>
            
            <h3>3.1 Gambling Risks</h3>
            <p>
              You acknowledge and agree that:
            </p>
            <ul>
              <li>Gambling and sports betting involve substantial risk of financial loss</li>
              <li>You may lose all money wagered</li>
              <li>Gambling can be addictive and harmful</li>
              <li>You are solely responsible for your betting decisions</li>
              <li>We hold NO responsibility for any gambling losses you incur</li>
            </ul>

            <h3>3.2 Legal Compliance</h3>
            <p>
              You are solely responsible for ensuring that:
            </p>
            <ul>
              <li>Sports betting is legal in your jurisdiction</li>
              <li>You meet the legal age requirement for gambling in your location</li>
              <li>Your use of our Services complies with all applicable laws</li>
              <li>You use licensed and regulated betting platforms</li>
            </ul>

            <h3>3.3 Personal Discretion</h3>
            <p>
              <strong>Any action, bet, wager, or decision based upon information presented on the Site is made entirely at your sole discretion and risk.</strong> Sandlot Picks holds no responsibility whatsoever for any losses, damages, or negative outcomes resulting from your use of the Services.
            </p>
          </section>

          <section>
            <h2>4. License to Use Services</h2>
            
            <h3>4.1 Limited License</h3>
            <p>
              Subject to these Terms, we grant you a personal, limited, revocable, non-exclusive, non-transferable license to access and use our Site and Services solely for personal, non-commercial purposes.
            </p>

            <h3>4.2 Age Requirement</h3>
            <p>
              You must be at least 21 years of age (or the legal gambling age in your jurisdiction, whichever is higher) to use our Services. By using the Services, you represent and warrant that you meet this requirement.
            </p>

            <h3>4.3 Account Registration</h3>
            <p>
              To access certain Services, you must create an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information as needed</li>
              <li>Keep your login credentials secure and confidential</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2>5. Prohibited Uses</h2>
            <p>You may NOT:</p>
            <ul>
              <li>Use the Services for any illegal purpose or to encourage illegal gambling</li>
              <li>Reproduce, distribute, or commercially exploit our content without permission</li>
              <li>Use automated systems (bots, scrapers) to access the Site</li>
              <li>Attempt to reverse engineer our algorithms or predictive models</li>
              <li>Manipulate, distort, or misrepresent our analytics or data</li>
              <li>Share your account credentials with others</li>
              <li>Use the Services if you are a minor or legally prohibited from gambling</li>
              <li>Resell, sublicense, or redistribute our Services</li>
              <li>Use our data to create competing services</li>
            </ul>
          </section>

          <section>
            <h2>6. Intellectual Property Rights</h2>
            <p>
              All content, including analytics, algorithms, text, graphics, logos, data compilations, software, and other materials ("Content") are owned by Sandlot Picks or our licensors and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              You may not copy, modify, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, or sell any Content without our express written permission.
            </p>
          </section>

          <section>
            <h2>7. Disclaimer of Warranties</h2>
            <p className="important-notice">
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p>
              WE DO NOT WARRANT THAT:
            </p>
            <ul>
              <li>The Services will be uninterrupted, secure, or error-free</li>
              <li>Any predictions, analytics, or data will be accurate or reliable</li>
              <li>Use of the Services will result in profitable betting outcomes</li>
              <li>Defects will be corrected or that the Site is free from viruses</li>
            </ul>
          </section>

          <section>
            <h2>8. Limitation of Liability</h2>
            <p className="important-notice">
              TO THE FULLEST EXTENT PERMITTED BY LAW, SANDLOT PICKS, ITS OFFICERS, DIRECTORS, EMPLOYEES, AFFILIATES, AND PARTNERS SHALL NOT BE LIABLE FOR:
            </p>
            <ul>
              <li>Any gambling losses or financial losses of any kind</li>
              <li>Indirect, incidental, consequential, or punitive damages</li>
              <li>Loss of profits, revenue, data, or business opportunities</li>
              <li>Damages arising from your reliance on any information provided</li>
              <li>Errors, omissions, or inaccuracies in our analytics or predictions</li>
            </ul>
            <p>
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER IS LESS.
            </p>
          </section>

          <section>
            <h2>9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Sandlot Picks and its officers, directors, employees, and affiliates from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from:
            </p>
            <ul>
              <li>Your use of the Services</li>
              <li>Your betting activities or gambling losses</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any applicable laws or regulations</li>
              <li>Your infringement of any third-party rights</li>
            </ul>
          </section>

          <section>
            <h2>10. Subscription and Payment Terms</h2>
            
            <h3>10.1 Subscription Plans</h3>
            <p>
              Certain features may require a paid subscription. By subscribing, you agree to pay all applicable fees.
            </p>

            <h3>10.2 Cancellation and Refunds</h3>
            <ul>
              <li>Monthly subscriptions: No refunds</li>
              <li>Seasonal subscriptions: 30-day money-back guarantee</li>
              <li>Lifetime subscription: 30-day money-back guarantee</li>
              <li>Refund requests for *Seasonal subscriptions* and *Lifetime subscriptions* must be submitted within 30 days of purchase</li>
              <li>You may cancel your subscription at any time</li>
            </ul>

            <h3>10.3 Auto-Renewal</h3>
            <p>
              The monthly access subscription plan: automatically renew unless canceled before the renewal date. You will be charged the then-current subscription fee.
            </p>
            <p>
              Seasonal and Lifetime access subscription plans: do not auto-renew. They are one-time payments for the specified duration.
            </p>
          </section>

          <section>
            <h2>11. Modification and Termination</h2>
            
            <h3>11.1 Changes to Services</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Services at any time without notice.
            </p>

            <h3>11.2 Account Termination</h3>
            <p>
              We may suspend or terminate your access to the Services if you violate these Terms or for any other lawful reason. Upon termination, your license to use the Services immediately expires.
            </p>
          </section>

          <section>
            <h2>12. Responsible Gambling</h2>
            <p>
              We encourage responsible gambling. If you or someone you know has a gambling problem, please seek help:
            </p>
            <ul>
              <li>National Council on Problem Gambling: 1-800-522-4700</li>
              <li>GamblersAnonymous.org</li>
              <li>SAMHSA National Helpline: 1-800-662-4357</li>
            </ul>
          </section>

          <section>
            <h2>13. Privacy</h2>
            <p>
              Your use of the Services is also governed by our Privacy Policy, available at <a href="/privacy-policy">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2>14. Governing Law and Jurisdiction</h2>
            <p>
              These Terms shall be governed by the laws of [Your State/Country], without regard to conflict of law provisions. Any disputes shall be resolved exclusively in the courts of [Your Jurisdiction].
            </p>
          </section>

          <section>
            <h2>15. Miscellaneous</h2>
            
            <h3>15.1 Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Sandlot Picks.
            </p>

            <h3>15.2 Severability</h3>
            <p>
              If any provision is found unenforceable, the remaining provisions shall remain in full effect.
            </p>

            <h3>15.3 No Waiver</h3>
            <p>
              Our failure to enforce any right or provision shall not constitute a waiver of that right.
            </p>

            <h3>15.4 Assignment</h3>
            <p>
              You may not assign these Terms without our prior written consent.
            </p>

            <h3>15.5 Changes to Terms</h3>
            <p>
              We may update these Terms at any time. Continued use of the Services constitutes acceptance of the updated Terms.
            </p>

            <h3>15.6 Contact Information</h3>
            <p>
              For questions about these Terms, contact us at:<br />
              Email: support@sandlotpicks.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TermsOfUse;
