import React, { useState, useEffect, useCallback } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import "../login.css";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../globalContext";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("info");
    const [focusedField, setFocusedField] = useState(null);
    const [emailSent, setEmailSent] = useState(false);
    const navigate = useNavigate();
    const { globalValue } = useGlobalContext(false);
    const [loading, setLoading] = useState(false);
    
    // reCAPTCHA v3
    const { executeRecaptcha } = useGoogleReCaptcha();

    // Show reCAPTCHA badge on this page, hide on unmount
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

    useEffect(() => {
        if (globalValue !== "") {
            setEmail(globalValue);
        }
    }, [globalValue, navigate]);

    const handleForgotPassword = useCallback(async (e) => {
        e.preventDefault();
        
        // Execute reCAPTCHA v3 (required from first attempt)
        if (!executeRecaptcha) {
            setMessageType("error");
            setMessage("reCAPTCHA not ready. Please try again.");
            return;
        }
        
        try {
            const token = await executeRecaptcha('forgot_password');
            if (!token) {
                setMessageType("error");
                setMessage("reCAPTCHA verification failed. Please try again.");
                return;
            }
            //console.log("reCAPTCHA token obtained for forgot password");
        } catch (error) {
            setMessageType("error");
            setMessage("reCAPTCHA verification failed. Please try again.");
            return;
        }
        
        setLoading(true);
        setMessage("");

        try {
            const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/forgotPassword", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipient_email: email }),
            });

            const data = await response.json();
            const body = data.body ? JSON.parse(data.body) : data;

            if (data.statusCode === 200) {
                setMessageType("success");
                setMessage(body.message || "Reset link sent successfully!");
                setEmailSent(true);
            } else {
                setMessageType("error");
                setMessage(body.message || "Failed to send reset link. Please try again.");
            }
        } catch (error) {
            setMessageType("error");
            setMessage("An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [executeRecaptcha, email]);

    return (
        <div className="login-page">
            <div className="login-left">
                <div className="login-branding">
                    <div className="login-logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h1>Reset Password</h1>
                    <p>Don't worry, it happens to the best of us. Enter your email and we'll send you a link to reset your password.</p>
                    <div className="login-features">
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Secure reset process</span>
                        </div>
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Link expires in 24 hours</span>
                        </div>
                        <div className="feature-item">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Check spam folder too</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    {!emailSent ? (
                        <>
                            <div className="login-header">
                                <div className="header-icon">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h2>Forgot Password?</h2>
                                <p>No worries, we'll send you reset instructions.</p>
                            </div>

                            <form onSubmit={handleForgotPassword} className="login-form">
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
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setFocusedField('email')}
                                            onBlur={() => setFocusedField(null)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="login-btn" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="0"/>
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <polygon points="22,2 15,22 11,13 2,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </>
                                    )}
                                </button>

                                {message && (
                                    <div className={`message-box ${messageType}`}>
                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            {messageType === 'success' ? (
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            ) : messageType === 'info' ? (
                                                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            ) : (
                                                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            )}
                                        </svg>
                                        <span>{message}</span>
                                    </div>
                                )}
                            </form>
                        </>
                    ) : (
                        <div className="success-state">
                            <div className="success-icon">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            <h2>Check Your Email</h2>
                            <p>We've sent a password reset link to:</p>
                            <div className="email-display">{email}</div>
                            <p className="hint-text">Didn't receive the email? Check your spam folder or try again.</p>
                            <button className="login-btn secondary" onClick={() => setEmailSent(false)}>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="1,4 1,10 7,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Try Again
                            </button>
                        </div>
                    )}

                    <div className="login-footer">
                        <p><a href="/login">← Back to Sign In</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
