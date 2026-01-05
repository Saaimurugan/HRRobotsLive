import React from 'react';

const EULA = () => {
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

  const importantBoxStyle = {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>End User License Agreement (EULA)</h1>
        <p style={subtitleStyle}>Last Updated: January 2026</p>
      </div>

      <div style={importantBoxStyle}>
        <p style={{ margin: 0, fontWeight: '500' }}>
          <strong>IMPORTANT:</strong> Please read this End User License Agreement carefully before using the HRrobots platform. By accessing or using our services, you agree to be bound by the terms of this agreement.
        </p>
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>1. Agreement to Terms</h2>
        <p style={paragraphStyle}>
          This End User License Agreement ("Agreement") is a legal agreement between you ("User," "you," or "your") and HRrobots ("Company," "we," "our," or "us") governing your use of the HRrobots recruitment assessment platform, including all related software, services, and documentation (collectively, the "Service").
        </p>
        <p style={paragraphStyle}>
          By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Agreement. If you do not agree to these terms, you must not access or use the Service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>2. License Grant</h2>
        <p style={paragraphStyle}>
          Subject to your compliance with this Agreement, HRrobots grants you a limited, non-exclusive, non-transferable, revocable license to:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Access and use the Service for your personal or internal business purposes</li>
          <li style={listItemStyle}>Create and manage recruitment assessments and interviews</li>
          <li style={listItemStyle}>View and analyze assessment results and analytics</li>
          <li style={listItemStyle}>Communicate with candidates through the platform</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>3. Restrictions on Use</h2>
        <p style={paragraphStyle}>You agree NOT to:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Copy, modify, distribute, sell, or lease any part of the Service</li>
          <li style={listItemStyle}>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
          <li style={listItemStyle}>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
          <li style={listItemStyle}>Attempt to gain unauthorized access to the Service or its related systems</li>
          <li style={listItemStyle}>Interfere with or disrupt the integrity or performance of the Service</li>
          <li style={listItemStyle}>Share your account credentials with third parties</li>
          <li style={listItemStyle}>Use automated systems or software to extract data from the Service (scraping)</li>
          <li style={listItemStyle}>Upload or transmit viruses, malware, or other malicious code</li>
          <li style={listItemStyle}>Impersonate any person or entity or misrepresent your affiliation</li>
          <li style={listItemStyle}>Use the Service to discriminate against candidates based on protected characteristics</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>4. Account Responsibilities</h2>
        <p style={paragraphStyle}>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Provide accurate and complete information when creating your account</li>
          <li style={listItemStyle}>Keep your login credentials secure and confidential</li>
          <li style={listItemStyle}>Notify us immediately of any unauthorized use of your account</li>
          <li style={listItemStyle}>Ensure that your use of the Service complies with all applicable laws and regulations</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>5. Intellectual Property Rights</h2>
        <p style={paragraphStyle}>
          The Service and its original content, features, and functionality are owned by HRrobots and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </p>
        <p style={paragraphStyle}>
          You retain ownership of any content you submit through the Service, but you grant HRrobots a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content solely for the purpose of providing the Service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>6. Assessment and Proctoring</h2>
        <p style={paragraphStyle}>
          When using the assessment and proctoring features of the Service, you acknowledge and agree that:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Candidates will be required to provide consent for camera, microphone, and screen monitoring</li>
          <li style={listItemStyle}>Assessment sessions may be recorded for verification and integrity purposes</li>
          <li style={listItemStyle}>AI-powered proctoring may be used to detect potential violations</li>
          <li style={listItemStyle}>You will use assessment results fairly and in compliance with employment laws</li>
          <li style={listItemStyle}>You will not share assessment content or questions with unauthorized parties</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>7. Data Protection and Privacy</h2>
        <p style={paragraphStyle}>
          Your use of the Service is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the Service, you consent to the data practices described in our Privacy Policy.
        </p>
        <p style={paragraphStyle}>
          You agree to comply with all applicable data protection laws, including GDPR and the Digital Personal Data Protection Act, 2023 (India), when processing candidate data through the Service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>8. Service Availability and Modifications</h2>
        <p style={paragraphStyle}>
          We reserve the right to:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Modify, suspend, or discontinue the Service at any time without prior notice</li>
          <li style={listItemStyle}>Update or change the features and functionality of the Service</li>
          <li style={listItemStyle}>Impose limits on certain features or restrict access to parts of the Service</li>
          <li style={listItemStyle}>Perform scheduled or unscheduled maintenance</li>
        </ul>
        <p style={paragraphStyle}>
          We will make reasonable efforts to provide advance notice of significant changes or scheduled downtime.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>9. Disclaimer of Warranties</h2>
        <p style={paragraphStyle}>
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p style={paragraphStyle}>
          We do not warrant that the Service will be uninterrupted, error-free, or completely secure. You use the Service at your own risk.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>10. Limitation of Liability</h2>
        <p style={paragraphStyle}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, HRROBOTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
        </p>
        <p style={paragraphStyle}>
          Our total liability for any claims arising from this Agreement shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>11. Indemnification</h2>
        <p style={paragraphStyle}>
          You agree to indemnify, defend, and hold harmless HRrobots and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of or related to:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Your use of the Service</li>
          <li style={listItemStyle}>Your violation of this Agreement</li>
          <li style={listItemStyle}>Your violation of any rights of another party</li>
          <li style={listItemStyle}>Any content you submit through the Service</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>12. Termination</h2>
        <p style={paragraphStyle}>
          We may terminate or suspend your access to the Service immediately, without prior notice, for any reason, including if you breach this Agreement. Upon termination:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Your right to use the Service will immediately cease</li>
          <li style={listItemStyle}>We may delete your account and associated data</li>
          <li style={listItemStyle}>Provisions that by their nature should survive termination will remain in effect</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>13. Governing Law and Dispute Resolution</h2>
        <p style={paragraphStyle}>
          This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from this Agreement shall be resolved through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>14. Changes to This Agreement</h2>
        <p style={paragraphStyle}>
          We reserve the right to modify this Agreement at any time. We will notify you of any material changes by posting the updated Agreement on our website with a new "Last Updated" date. Your continued use of the Service after such changes constitutes your acceptance of the modified Agreement.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>15. Severability</h2>
        <p style={paragraphStyle}>
          If any provision of this Agreement is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>16. Entire Agreement</h2>
        <p style={paragraphStyle}>
          This Agreement, together with our Privacy Policy and any other legal notices published on the Service, constitutes the entire agreement between you and HRrobots regarding your use of the Service and supersedes all prior agreements and understandings.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>17. Contact Information</h2>
        <div style={contactBoxStyle}>
          <p style={{ marginBottom: '10px' }}>For any questions or concerns regarding this End User License Agreement, please contact us:</p>
          <p style={{ marginBottom: '5px' }}><strong>Email:</strong> <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a></p>
          <p style={{ marginBottom: '5px' }}><strong>Website:</strong> <a href="https://www.hrrobots.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1CBBB4' }}>www.hrrobots.com</a></p>
        </div>
      </section>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#e8f5e9', 
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, color: '#2e7d32', fontWeight: '500' }}>
          By using HRrobots, you acknowledge that you have read, understood, and agree to be bound by this End User License Agreement.
        </p>
      </div>
    </div>
  );
};

export default EULA;
