import { useState } from "react";
import { useGlobalContext } from "../globalContext";
import "../confirmationBox.css";

function SendEmailModal({ isOpen, onClose, showToast, testLink, templateName }) {
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { globalValue } = useGlobalContext();

  if (!isOpen) return null;

  const handleClose = () => {
    setCandidateName("");
    setCandidateEmail("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!candidateName.trim()) {
      showToast('error', 'Name Required', 'Please enter the candidate\'s name.');
      return;
    }

    if (!candidateEmail.trim()) {
      showToast('error', 'Email Required', 'Please enter the candidate\'s email address.');
      return;
    }

    setIsSending(true);

    try {
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1cbbb4;">You're Invited to Take a Screening Test</h2>
          <p>Hello ${candidateName},</p>
          <p><strong>${globalValue}</strong> has invited you to complete a screening test.</p>
          <p><strong>Test Name:</strong> ${templateName || 'Screening Test'}</p>
          <p style="margin-top: 20px;">
            <a href="${testLink}" 
               style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;">
              Start Test
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Good luck!
          </p>
        </div>
      `;

      const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/sendEmailSMTP", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: candidateEmail,
          subject: `${globalValue} invited you to take a screening test`,
          body: emailBody
        }),
      });

      const data = await response.json();

      if (data.statusCode === 200) {
        showToast('success', 'Email Sent', `Test link sent successfully to ${candidateEmail}`);
        handleClose();
      } else {
        showToast('error', 'Failed to Send', 'Failed to send email. Please try again.');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred while sending the email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="overlay">
      <div className="confirmation-box" style={{ minWidth: '500px' }}>
        <h2>Send Test Link via Email</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="candidateName">Candidate Name *</label>
            <input 
              type="text" 
              id="candidateName"
              placeholder="Enter candidate's full name"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              disabled={isSending}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="candidateEmail">Candidate Email *</label>
            <input 
              type="email" 
              id="candidateEmail"
              placeholder="candidate@example.com"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              disabled={isSending}
              required 
            />
          </div>

          <div className="buttons">
            <button type="submit" disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Email'}
            </button>
            <button type="button" onClick={handleClose} disabled={isSending}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SendEmailModal;