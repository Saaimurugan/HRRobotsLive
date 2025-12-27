import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../login.css";

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [message, setMessage] = useState("Verifying your email...");
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            const email = searchParams.get("email");
            const token = searchParams.get("token");

            if (!email || !token) {
                setStatus("error");
                setMessage("Invalid verification link. Please check your email and try again.");
                return;
            }

            try {
                const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/validateUser", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, token }),
                });

                const data = await response.json();
                const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;

                if (data.statusCode === 200) {
                    setStatus("success");
                    setMessage(bodyData.message || "Email verified successfully!");
                } else {
                    setStatus("error");
                    setMessage(bodyData.message || "Verification failed. Please try again.");
                }
            } catch (error) {
                setStatus("error");
                setMessage("An error occurred during verification. Please try again.");
            }
        };

        verifyEmail();
    }, [searchParams]);

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
                    <h1>Email Verification</h1>
                    <p>We're verifying your email address to activate your HR Robots account.</p>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    <div className="login-header" style={{ textAlign: 'center' }}>
                        {status === "verifying" && (
                            <>
                                <svg className="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '48px', height: '48px', margin: '0 auto 20px' }}>
                                    <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="0"/>
                                </svg>
                                <h2>Verifying...</h2>
                            </>
                        )}
                        {status === "success" && (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px', margin: '0 auto 20px', color: 'var(--color-success)' }}>
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <h2>Email Verified!</h2>
                            </>
                        )}
                        {status === "error" && (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '64px', height: '64px', margin: '0 auto 20px', color: 'var(--color-error)' }}>
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                <h2>Verification Failed</h2>
                            </>
                        )}
                        <p>{message}</p>
                    </div>

                    {status !== "verifying" && (
                        <div style={{ marginTop: '30px' }}>
                            <button 
                                className="login-btn" 
                                onClick={() => navigate("/login")}
                                style={{ width: '100%' }}
                            >
                                {status === "success" ? "Continue to Login" : "Back to Login"}
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="12,5 19,12 12,19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
