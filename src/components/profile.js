import React, { useState, useEffect } from 'react';
import { useGlobalContext } from "../globalContext";
import { useNavigate } from 'react-router-dom';
import "../profile.css";

const Profile = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // S3 Config
  const [bucketKey, setBucketKey] = useState('');
  const [bucketId, setBucketId] = useState('');

  // LLM Config
  const [llmKey, setLlmKey] = useState('');
  const [selectedLLM, setSelectedLLM] = useState('');

  const { globalAPIValue, globalValue, JWTValue } = useGlobalContext();
  const navigate = useNavigate();

  const publicLLMs = [
    { value: 'openai', label: 'OpenAI GPT-4' },
    { value: 'claude', label: 'Anthropic Claude' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'nova', label: 'AWS Nova' }
  ];

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
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

  return (
    <div className="profile-page">
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
