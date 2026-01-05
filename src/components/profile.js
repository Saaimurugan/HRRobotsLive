import { useState, useEffect, useCallback } from 'react';
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from 'react-router-dom';
import "../profile.css";

// Toast Component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
          <svg className="toast-icon" viewBox="0 0 24 24">
            {toast.type === 'error' && <path fill="#e53e3e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>}
            {toast.type === 'success' && <path fill="#38a169" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
            {toast.type === 'warning' && <path fill="#dd6b20" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
            {toast.type === 'info' && <path fill="#3182ce" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

const Profile = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toasts, setToasts] = useState([]);

  // S3 Config
  const [bucketKey, setBucketKey] = useState('');
  const [bucketId, setBucketId] = useState('');

  // Invite User
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // LLM Config
  const [llmKey, setLlmKey] = useState('');
  const [selectedLLM, setSelectedLLM] = useState('');

  const { globalValue, JWTValue, setRedirectPath, logout } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Toast functions
  const showToast = useCallback((type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  // Session handler
  const checkUnauthorized = useCallback((data) => {
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      setRedirectPath(location.pathname);
      showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
      logout();
      setTimeout(() => navigate('/login'), 1500);
      return true;
    }
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized") {
          setRedirectPath(location.pathname);
          showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
          logout();
          setTimeout(() => navigate('/login'), 1500);
          return true;
        }
      } catch (e) {}
    }
    return false;
  }, [location.pathname, logout, navigate, setRedirectPath, showToast]);

  const publicLLMs = [
    { value: 'openai', label: 'OpenAI GPT-4' },
    { value: 'claude', label: 'Anthropic Claude' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'nova', label: 'AWS Nova' }
  ];

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return passwordRegex.test(password);
  };

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
  }, [globalValue, navigate]);

  const handlePasswordInputChange = (e) => {
    setPassword(e.target.value);
    if (confirmPassword && e.target.value !== confirmPassword) {
      setPasswordError("Passwords do not match");
    } else if (!validatePassword(e.target.value)) {
      setPasswordError("Password must be at least 8 characters, include uppercase, lowercase, number, and special character.");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (password && e.target.value !== password) {
      setPasswordError("Passwords do not match");
    } else if (!validatePassword(e.target.value)) {
      setPasswordError("Password must be at least 8 characters, include uppercase, lowercase, number, and special character.");
    } else {
      setPasswordError("");
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    setPasswordError("");

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 8 characters, include uppercase, lowercase, number, and special character.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/resetPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: globalValue, password, token: JWTValue }),
      });

      const data = await response.json();

      if (checkUnauthorized(data)) return;

      if (data.statusCode === 200) {
        setMessage("Password updated successfully!");
        setMessageType("success");
        setPassword('');
        setConfirmPassword('');
      } else {
        setMessage(data.message || "Password update failed. Please try again.");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again later.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveS3Config = () => {
    // Add your S3 config save API call here
    setMessage("S3 configuration saved");
    setMessageType("success");
  };

  const handleSaveLLMConfig = () => {
    // Add your LLM config save API call here
    setMessage("LLM configuration saved");
    setMessageType("success");
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const personalEmailDomains = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "icloud.com", "protonmail.com", "zohomail.in.com", "mail.com", "gmx.com",
    "yandex.com", "tutanota.com", "fastmail.com", "live.com", "msn.com",
    "qq.com", "naver.com", "rediffmail.com", "rambler.ru", "seznam.cz",
    "freenet.de", "web.de", "orange.fr", "libero.it", "virgilio.it",
    "hushmail.com", "163.com", "126.com", "sina.com", "lycos.com"
  ];

  const isPersonalEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return personalEmailDomains.includes(domain);
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      showToast('error', 'Validation Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(inviteEmail)) {
      showToast('error', 'Validation Error', 'Please enter a valid email address');
      return;
    }

    if (isPersonalEmail(inviteEmail)) {
      showToast('error', 'Validation Error', 'Personal emails are not allowed. Please use a business email address.');
      return;
    }

    setInviteLoading(true);

    try {
      // Check if email is already registered
      const checkEmailResponse = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/checkEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const checkData = await checkEmailResponse.json();

      if (checkData.statusCode !== 200) {
        // Email is already registered
        showToast('warning', 'Already Registered', `${inviteEmail} is already registered on HR Robots.`);
        setInviteLoading(false);
        return;
      }

      // Email not registered, send invitation
      const inviteBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1cbbb4;">You're Invited to HR Robots!</h2>
          <p>Hello,</p>
          <p><strong>${globalValue}</strong> has invited you to join HR Robots platform.</p>
          <p>HR Robots helps streamline your hiring process with AI-powered tools for candidate profiling, interviews, and more.</p>
          <p style="margin-top: 20px;">
            <a href="${window.location.origin}/signup" 
               style="background: linear-gradient(135deg, #1cbbb4 0%, #0d9488 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;">
              Get Started
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            If you have any questions, please contact the person who invited you.
          </p>
        </div>
      `;

      const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/sendEmailSMTP", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: inviteEmail,
          subject: `${globalValue} invited you to join HR Robots`,
          body: inviteBody
        }),
      });

      const data = await response.json();

      if (checkUnauthorized(data)) return;

      if (data.statusCode === 200) {
        showToast('success', 'Invitation Sent', `Invitation email sent to ${inviteEmail}`);
        setInviteEmail('');
      } else {
        showToast('error', 'Failed to Send', data.body || 'Failed to send invitation. Please try again.');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred while sending the invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="profile-container">
        <div className="profile-header">
          <button onClick={() => navigate(-1)} className="profile-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Profile Settings</h1>
        </div>

        <div className="config-sections">
          {/* Password Change Section */}
          <div className="config-card password-section">
            <div className="config-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3>Change Password</h3>
            </div>
            <form className="config-form" onSubmit={handlePasswordChange}>
              <div className="config-form-row">
                <div className="config-form-group">
                  <label>New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordInputChange}
                      placeholder="Enter new password"
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn" 
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="config-form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              {passwordError && <p className="password-error">{passwordError}</p>}
              <button type="submit" className="save-btn" disabled={loading || passwordError !== ""}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Invite User Section */}
          <div className="config-card">
            <div className="config-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <h3>Invite User</h3>
            </div>
            <form className="config-form" onSubmit={handleInviteUser}>
              <div className="config-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address to invite"
                />
              </div>
              <button type="submit" className="save-btn" disabled={inviteLoading || !inviteEmail.trim()}>
                {inviteLoading ? "Sending..." : "Send Invitation"}
              </button>
            </form>
          </div>

          {/* S3 Configuration Section */}
          {/* <div className="config-card">
            <div className="config-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <h3>S3 Configuration</h3>
            </div>
            <div className="config-form">
              <div className="config-form-row">
                <div className="config-form-group">
                  <label>S3 Bucket Key</label>
                  <input
                    type="text"
                    value={bucketKey}
                    onChange={(e) => setBucketKey(e.target.value)}
                    placeholder="Enter S3 bucket key"
                  />
                </div>
                <div className="config-form-group">
                  <label>S3 Bucket ID</label>
                  <input
                    type="text"
                    value={bucketId}
                    onChange={(e) => setBucketId(e.target.value)}
                    placeholder="Enter S3 bucket ID"
                  />
                </div>
              </div>
              <button type="button" className="save-btn" onClick={handleSaveS3Config}>
                Save S3 Configuration
              </button>
            </div>
          </div> */}

          {/* LLM Configuration Section */}
          {/* <div className="config-card">
            <div className="config-card-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                <circle cx="7.5" cy="14.5" r="1.5" />
                <circle cx="16.5" cy="14.5" r="1.5" />
              </svg>
              <h3>LLM Configuration</h3>
            </div>
            <div className="config-form">
              <div className="config-form-row">
                <div className="config-form-group">
                  <label>Select LLM Provider</label>
                  <select
                    value={selectedLLM}
                    onChange={(e) => setSelectedLLM(e.target.value)}
                  >
                    <option value="">Select LLM</option>
                    {publicLLMs.map(llm => (
                      <option key={llm.value} value={llm.value}>{llm.label}</option>
                    ))}
                  </select>
                </div>
                <div className="config-form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={llmKey}
                    onChange={(e) => setLlmKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                </div>
              </div>
              <button type="button" className="save-btn" onClick={handleSaveLLMConfig}>
                Save LLM Configuration
              </button>
            </div>
          </div> */}

          {message && (
            <div className={`profile-message ${messageType}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
