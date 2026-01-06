import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import "../login.css";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../globalContext";

// Storage key for failed attempts
const FAILED_ATTEMPTS_KEY = "loginFailedAttempts";
const MAX_FAILED_ATTEMPTS = 3;

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("error");
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [eulaAccepted, setEulaAccepted] = useState(false);
    const navigate = useNavigate();
    const { setGlobalValue, setJWTValue, getAndClearRedirectPath } = useGlobalContext("");
    const [loading, setLoading] = useState(false);
    
    // reCAPTCHA v3
    const { executeRecaptcha } = useGoogleReCaptcha();
    
    // Failed attempts tracking
    const [failedAttempts, setFailedAttempts] = useState(() => {
        const stored = sessionStorage.getItem(FAILED_ATTEMPTS_KEY);
        return stored ? parseInt(stored, 10) : 0;
    });
    const [requireCaptcha, setRequireCaptcha] = useState(false);

    // Show reCAPTCHA badge on login page, hide on unmount
    useEffect(() => {
        const badge = document.querySelector('.grecaptcha-badge');
        if (badge) {
            badge.style.visibility = 'visible';
            badge.style.opacity = '1';
            badge.style.pointerEvents = 'auto';
        }
        return () => {
            if (badge) {
                badge.style.visibility = 'hidden';
                badge.style.opacity = '0';
                badge.style.pointerEvents = 'none';
            }
        };
    }, []);

    // Update requireCaptcha when failedAttempts changes
    useEffect(() => {
        setRequireCaptcha(failedAttempts >= MAX_FAILED_ATTEMPTS);
    }, [failedAttempts]);

    // Persist failed attempts to sessionStorage
    useEffect(() => {
        sessionStorage.setItem(FAILED_ATTEMPTS_KEY, failedAttempts.toString());
    }, [failedAttempts]);

    const handleLogin = useCallback(async (e) => {
        e.preventDefault();
        if (loading) return;
        
        // Check if EULA is accepted
        if (!eulaAccepted) {
            setMessageType("error");
            setMessage("Please accept the End User License Agreement to continue.");
            return;
        }
        
        // Execute reCAPTCHA v3 if required (after 3 failed attempts)
        if (requireCaptcha) {
            if (!executeRecaptcha) {
                setMessageType("error");
                setMessage("reCAPTCHA not ready. Please try again.");
                return;
            }
            
            try {
                const token = await executeRecaptcha('login');
                if (!token) {
                    setMessageType("error");
                    setMessage("reCAPTCHA verification failed. Please try again.");
                    return;
                }
                // Token obtained successfully - in production, verify this token on your backend
                //console.log("reCAPTCHA token obtained for login");
            } catch (error) {
                setMessageType("error");
                setMessage("reCAPTCHA verification failed. Please try again.");
                return;
            }
        }
        
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                setMessageType("success");
                const bodyData = JSON.parse(data.body);
                setMessage(bodyData.message || "Login successful!");
                setGlobalValue(email);
                setJWTValue(bodyData.token);
                
                // Reset failed attempts on successful login
                setFailedAttempts(0);
                sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
                
                const redirectTo = getAndClearRedirectPath();
                navigate(redirectTo);
            } else if (data.statusCode === 403) {
                // User not verified
                const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
                setMessageType("error");
                setMessage(bodyData?.message || "Please verify your email before logging in.");
            } else {
                setMessageType("error");
                const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
                setMessage(bodyData?.message || data.message || "Login failed! Email or password is incorrect.");
                setFailedAttempts(prev => prev + 1);
            }
        } catch (error) {
            setMessageType("error");
            setMessage("An error occurred. Please try again later.");
            setFailedAttempts(prev => prev + 1);
        } finally {
            setLoading(false);
        }
    }, [loading, requireCaptcha, executeRecaptcha, email, password, eulaAccepted, setGlobalValue, setJWTValue, getAndClearRedirectPath, navigate]);

    return (
        <div className="login-page">
            <div className="login-left">
                <div className="login-branding">
                    <div className="login-logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to continue to your dashboard and manage your interviews seamlessly.</p>
                    <div className="login-features">
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>AI-Powered Interviews</span>
                        </div>
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Smart Analytics</span>
                        </div>
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Secure & Reliable</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="login-right">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Sign In</h2>
                        <p>Enter your credentials to access your account</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="login-form">
                        <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'has-value' : ''}`}>
                            <label htmlFor="email">Email Address</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email" 
                                    placeholder="you@example.com" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div className={`input-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <svg className="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    id="password" 
                                    name="password" 
                                    placeholder="Enter your password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    required 
                                />
                                <button 
                                    type="button" 
                                    className="password-toggle" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        <div className="form-options">
                            <span 
                                className="forgot-link" 
                                onClick={() => {
                                    setGlobalValue(email);
                                    navigate("/forgot-password");
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                Forgot password?
                            </span>
                        </div>
                        
                        {/* Show message when CAPTCHA is active */}
                        {requireCaptcha && (
                            <div className="captcha-notice">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <span>Security verification active due to multiple failed attempts</span>
                            </div>
                        )}
                        
                        {/* EULA Checkbox */}
                        <div className="eula-checkbox">
                            <label className="eula-label">
                                <input
                                    type="checkbox"
                                    checked={eulaAccepted}
                                    onChange={(e) => setEulaAccepted(e.target.checked)}
                                    className="eula-input"
                                />
                                <span className="eula-text">
                                    I agree to the{' '}
                                    <a 
                                        href="/eula" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="eula-link"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        End User License Agreement
                                    </a>
                                </span>
                            </label>
                        </div>
                        
                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="0"/>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <polyline points="12,5 19,12 12,19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </>
                            )}
                        </button>
                        
                        {message && (
                            <div className={`message-box ${messageType}`}>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {messageType === 'success' ? (
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    ) : (
                                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    )}
                                </svg>
                                <span>{message}</span>
                            </div>
                        )}
                    </form>
                    
                    <div className="login-footer">
                        <p>Don't have an account? <a href="/signup">Create one</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
