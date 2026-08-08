import { useState } from "react";
import { useGlobalContext } from "../globalContext";
import { useSessionHandler } from "../useSessionHandler";
import "../confirmationBox.css";

function SendEmailModal({ isOpen, onClose, showToast, testLink, templateName }) {
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { globalValue, JWTValue } = useGlobalContext();

  // Session handler
  const { checkUnauthorized, checkHttpStatus } = useSessionHandler(showToast);

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
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/sendTestInviteEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": JWTValue,
        },
        body: JSON.stringify({
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          company_name: globalValue,
          template_name: templateName || "Screening Test",
          test_link: testLink,
        }),
      });

      if (checkHttpStatus(response)) return;
      const data = await response.json();

      if (checkUnauthorized(data)) return;

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