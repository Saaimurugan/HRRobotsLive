import React from 'react';

const DataProtectionPolicy = () => {
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

  const highlightBoxStyle = {
    background: '#e8f5f4',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid #1CBBB4',
    marginBottom: '20px'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px'
  };

  const thStyle = {
    background: '#1CBBB4',
    color: 'white',
    padding: '12px',
    textAlign: 'left',
    border: '1px solid #ddd'
  };

  const tdStyle = {
    padding: '12px',
    border: '1px solid #ddd'
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Data Protection & Grievance Redressal Policy</h1>
        <p style={subtitleStyle}>Last Updated: January 2026</p>
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>1. Introduction</h2>
        <p style={paragraphStyle}>
          HRrobots is committed to protecting the personal data of all individuals who interact with our platform. This Data Protection & Grievance Redressal Policy outlines our commitment to data protection and provides a clear mechanism for addressing any concerns or complaints related to the processing of personal data.
        </p>
        <p style={paragraphStyle}>
          This policy is established in compliance with the General Data Protection Regulation (GDPR), the Digital Personal Data Protection Act, 2023 (DPDP Act) of India, and other applicable data protection laws.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>2. Data Protection Principles</h2>
        <p style={paragraphStyle}>We adhere to the following data protection principles:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>Lawfulness, Fairness, and Transparency:</strong> We process personal data lawfully, fairly, and in a transparent manner.</li>
          <li style={listItemStyle}><strong>Purpose Limitation:</strong> We collect personal data for specified, explicit, and legitimate purposes only.</li>
          <li style={listItemStyle}><strong>Data Minimization:</strong> We collect only the personal data that is necessary for the intended purpose.</li>
          <li style={listItemStyle}><strong>Accuracy:</strong> We take reasonable steps to ensure personal data is accurate and up-to-date.</li>
          <li style={listItemStyle}><strong>Storage Limitation:</strong> We retain personal data only for as long as necessary.</li>
          <li style={listItemStyle}><strong>Integrity and Confidentiality:</strong> We implement appropriate security measures to protect personal data.</li>
          <li style={listItemStyle}><strong>Accountability:</strong> We are responsible for demonstrating compliance with data protection principles.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>3. Data Fiduciary / Data Controller</h2>
        <div style={highlightBoxStyle}>
          <p style={{ marginBottom: '10px' }}>
            <strong>HRrobots</strong> acts as the Data Fiduciary under the DPDP Act, 2023 and Data Controller under GDPR for all personal data processed through our platform.
          </p>
          <p style={{ margin: 0 }}>
            We are responsible for determining the purposes and means of processing personal data and ensuring compliance with applicable data protection laws.
          </p>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>4. Rights of Data Principals / Data Subjects</h2>
        <p style={paragraphStyle}>As a Data Principal (under DPDP Act) or Data Subject (under GDPR), you have the following rights:</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Right</th>
              <th style={thStyle}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><strong>Right to Access</strong></td>
              <td style={tdStyle}>Request information about and a copy of your personal data</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Right to Correction</strong></td>
              <td style={tdStyle}>Request correction of inaccurate or incomplete personal data</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Right to Erasure</strong></td>
              <td style={tdStyle}>Request deletion of your personal data under certain circumstances</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Right to Withdraw Consent</strong></td>
              <td style={tdStyle}>Withdraw your consent for data processing at any time</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Right to Grievance Redressal</strong></td>
              <td style={tdStyle}>Lodge a complaint regarding the processing of your personal data</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Right to Nominate</strong></td>
              <td style={tdStyle}>Nominate another person to exercise your rights in case of death or incapacity</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>5. Grievance Redressal Mechanism</h2>
        <p style={paragraphStyle}>
          We have established a robust grievance redressal mechanism to address any concerns or complaints related to the processing of your personal data.
        </p>
        
        <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '10px', marginTop: '20px' }}>5.1 How to File a Grievance</h3>
        <p style={paragraphStyle}>You may submit a grievance through any of the following channels:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>Email:</strong> Send your complaint to <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a></li>
          <li style={listItemStyle}><strong>Written Complaint:</strong> Submit a written complaint to our registered office address</li>
        </ul>

        <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '10px', marginTop: '20px' }}>5.2 Information Required</h3>
        <p style={paragraphStyle}>When filing a grievance, please provide:</p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Your full name and contact details</li>
          <li style={listItemStyle}>Description of the grievance or concern</li>
          <li style={listItemStyle}>Relevant supporting documents (if any)</li>
          <li style={listItemStyle}>The relief or resolution you are seeking</li>
        </ul>

        <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '10px', marginTop: '20px' }}>5.3 Response Timeline</h3>
        <div style={highlightBoxStyle}>
          <ul style={{ ...listStyle, marginBottom: 0 }}>
            <li style={listItemStyle}><strong>Acknowledgment:</strong> Within 48 hours of receiving your grievance</li>
            <li style={listItemStyle}><strong>Initial Response:</strong> Within 7 working days</li>
            <li style={listItemStyle}><strong>Resolution:</strong> Within 30 days from the date of receipt of the grievance</li>
          </ul>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>6. Data Protection Officer / Grievance Officer</h2>
        <p style={paragraphStyle}>
          We have appointed a Grievance Officer who is responsible for addressing all grievances related to the processing of personal data.
        </p>
        <div style={contactBoxStyle}>
          <p style={{ marginBottom: '10px' }}><strong>Grievance Officer Details:</strong></p>
          <p style={{ marginBottom: '5px' }}><strong>Email:</strong> <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a></p>
          <p style={{ marginBottom: '5px' }}><strong>Response Time:</strong> Within 48 hours</p>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>7. Escalation Process</h2>
        <p style={paragraphStyle}>
          If you are not satisfied with the resolution provided by our Grievance Officer, you may escalate your complaint to:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}><strong>For Indian Residents:</strong> The Data Protection Board of India established under the DPDP Act, 2023</li>
          <li style={listItemStyle}><strong>For EU/EEA Residents:</strong> The relevant Supervisory Authority in your country of residence</li>
          <li style={listItemStyle}><strong>For UK Residents:</strong> The Information Commissioner's Office (ICO)</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>8. Data Breach Notification</h2>
        <p style={paragraphStyle}>
          In the event of a personal data breach that is likely to result in a risk to your rights and freedoms, we will:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Notify the relevant supervisory authority within 72 hours of becoming aware of the breach</li>
          <li style={listItemStyle}>Notify affected individuals without undue delay if the breach is likely to result in high risk</li>
          <li style={listItemStyle}>Document all breaches and remedial actions taken</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>9. Security Measures</h2>
        <p style={paragraphStyle}>
          We implement comprehensive security measures to protect your personal data:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>End-to-end encryption for data transmission</li>
          <li style={listItemStyle}>Secure data storage with access controls</li>
          <li style={listItemStyle}>Regular security audits and vulnerability assessments</li>
          <li style={listItemStyle}>Employee training on data protection and security</li>
          <li style={listItemStyle}>Incident response and disaster recovery procedures</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>10. Third-Party Data Processors</h2>
        <p style={paragraphStyle}>
          When we engage third-party service providers to process personal data on our behalf, we ensure that:
        </p>
        <ul style={listStyle}>
          <li style={listItemStyle}>Appropriate data processing agreements are in place</li>
          <li style={listItemStyle}>Third parties implement adequate security measures</li>
          <li style={listItemStyle}>Data is processed only for specified purposes</li>
          <li style={listItemStyle}>Compliance with applicable data protection laws is maintained</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>11. Policy Updates</h2>
        <p style={paragraphStyle}>
          This policy may be updated from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes through our website or other appropriate means.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>12. Contact Information</h2>
        <div style={contactBoxStyle}>
          <p style={{ marginBottom: '15px' }}>For any questions, concerns, or to exercise your data protection rights, please contact us:</p>
          <p style={{ marginBottom: '5px' }}><strong>Email:</strong> <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a></p>
          <p style={{ marginBottom: '5px' }}><strong>Website:</strong> <a href="https://www.hrrobots.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1CBBB4' }}>www.hrrobots.com</a></p>
        </div>
      </section>
    </div>
  );
};

export default DataProtectionPolicy;
