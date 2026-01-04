import React from 'react';

const PrivacyPolicy = () => {
  const containerStyle = {
    fontFamily: "'Roboto', sans-serif",
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    color: '#333',
    lineHeight: '1.8'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '3px solid #1CBBB4'
  };

  const titleStyle = {
    fontSize: '32px',
    color: '#1CBBB4',
    marginBottom: '10px',
    fontWeight: '600'
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#666'
  };

  const sectionStyle = {
    marginBottom: '30px'
  };

  const sectionTitleStyle = {
    fontSize: '20px',
    color: '#1CBBB4',
    marginBottom: '15px',
    fontWeight: '600',
    borderLeft: '4px solid #1CBBB4',
    paddingLeft: '15px'
  };

  const paragraphStyle = {
    marginBottom: '15px',
    textAlign: 'justify'
  };

  const listStyle = {
    paddingLeft: '25px',
    marginBottom: '15px'
  };

  const listItemStyle = {
    marginBottom: '8px'
  };

  const contactBoxStyle = {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Privacy Policy</h1>
        <p style={subtitleStyle}>Last Updated: January 2026</p>
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>1. Introduction</h2>
        <p style={paragraphStyle}>
          HRrobots ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our recruitment assessment platform and related services.
        </p>
        <p style={paragraphStyle}>
          This policy is compliant with the General Data Protection Regulation (GDPR) and the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>2. Information We Collect</h2>
        <p style={paragraphStyle}>We collect the following types of information:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>Personal Identification Information:</strong> Name, email address, phone number, and government-issued ID documents.</li>
          <li style={listItemStyle}><strong>Biometric Data:</strong> Photographs captured during identity verification and proctoring.</li>
          <li style={listItemStyle}><strong>Assessment Data:</strong> Test responses, scores, and performance analytics.</li>
          <li style={listItemStyle}><strong>Technical Data:</strong> IP address, browser type, device information, and access logs.</li>
          <li style={listItemStyle}><strong>Proctoring Data:</strong> Audio/video recordings, screen activity, and behavioral patterns during assessments.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>3. Purpose of Data Collection</h2>
        <p style={paragraphStyle}>We process your personal data for the following purposes:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Identity verification and authentication</li>
          <li style={listItemStyle}>Conducting and proctoring online assessments</li>
          <li style={listItemStyle}>Preventing fraud and ensuring test integrity</li>
          <li style={listItemStyle}>Sharing assessment results with authorized recruiters and hiring organizations</li>
          <li style={listItemStyle}>Improving our services and user experience</li>
          <li style={listItemStyle}>Compliance with legal obligations</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>4. Legal Basis for Processing</h2>
        <p style={paragraphStyle}>We process your personal data based on:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>Consent:</strong> Your explicit consent provided before data collection.</li>
          <li style={listItemStyle}><strong>Contractual Necessity:</strong> Processing necessary for the performance of assessment services.</li>
          <li style={listItemStyle}><strong>Legitimate Interests:</strong> Our legitimate business interests in providing secure assessment services.</li>
          <li style={listItemStyle}><strong>Legal Compliance:</strong> Processing required to comply with applicable laws.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>5. Data Sharing and Disclosure</h2>
        <p style={paragraphStyle}>We may share your personal data with:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Authorized recruiters and hiring organizations who have engaged our services</li>
          <li style={listItemStyle}>Service providers who assist in operating our platform</li>
          <li style={listItemStyle}>Legal authorities when required by law or to protect our rights</li>
        </ul>
        <p style={paragraphStyle}>
          We do not sell your personal data to third parties. All data sharing is conducted in accordance with applicable data protection laws and with appropriate safeguards in place.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>6. Data Retention</h2>
        <p style={paragraphStyle}>
          We retain your personal data for a period of up to 90 days from the date of collection or until the completion of the recruitment process, whichever is earlier. Data may be retained longer if required by applicable law or for legitimate business purposes.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>7. Data Security</h2>
        <p style={paragraphStyle}>
          We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Encryption of data in transit and at rest</li>
          <li style={listItemStyle}>Access controls and authentication mechanisms</li>
          <li style={listItemStyle}>Regular security assessments and audits</li>
          <li style={listItemStyle}>Employee training on data protection</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>8. Your Rights</h2>
        <p style={paragraphStyle}>Under GDPR and DPDP Act, 2023, you have the following rights:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>Right to Access:</strong> Request a copy of your personal data.</li>
          <li style={listItemStyle}><strong>Right to Rectification:</strong> Request correction of inaccurate data.</li>
          <li style={listItemStyle}><strong>Right to Erasure:</strong> Request deletion of your personal data.</li>
          <li style={listItemStyle}><strong>Right to Restrict Processing:</strong> Request limitation of data processing.</li>
          <li style={listItemStyle}><strong>Right to Data Portability:</strong> Receive your data in a structured format.</li>
          <li style={listItemStyle}><strong>Right to Withdraw Consent:</strong> Withdraw your consent at any time.</li>
          <li style={listItemStyle}><strong>Right to Lodge a Complaint:</strong> File a complaint with the relevant data protection authority.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>9. International Data Transfers</h2>
        <p style={paragraphStyle}>
          Your personal data may be transferred to and processed in countries outside your country of residence. We ensure that such transfers are conducted with appropriate safeguards, including Standard Contractual Clauses approved by relevant authorities.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>10. Cookies and Tracking Technologies</h2>
        <p style={paragraphStyle}>
          We use cookies and similar tracking technologies to enhance your experience on our platform. You can manage your cookie preferences through your browser settings.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>11. Changes to This Policy</h2>
        <p style={paragraphStyle}>
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website with a new "Last Updated" date.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>12. Contact Us</h2>
        <div style={contactBoxStyle}>
          <p style={{ marginBottom: '10px' }}>For any questions or concerns regarding this Privacy Policy or to exercise your rights, please contact us:</p>
          <p style={{ marginBottom: '5px' }}><strong>Email:</strong> <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a></p>
          <p style={{ marginBottom: '5px' }}><strong>Website:</strong> <a href="https://www.hrrobots.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1CBBB4' }}>www.hrrobots.com</a></p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
