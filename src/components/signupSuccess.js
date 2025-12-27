import React from "react";
import { useNavigate } from "react-router-dom";
import "../login.css";

const SignupSuccess = () => {
    const navigate = useNavigate();

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
                    <h1>Almost There!</h1>
                    <p>Just one more step to complete your registration and start using HR Robots.</p>
                </div>
            </div>

            <div className="login-right">
                <div className="login-card">
                    <div className="login-header" style={{ textAlign: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '80px', height: '80px', margin: '0 auto 20px', color: 'var(--color-primary)' }}>
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h2>Thank You for Signing Up!</h2>
                        <p style={{ marginTop: '15px', color: '#666', lineHeight: '1.6' }}>
                            We've sent a verification email to your inbox. Please check your email and click the verification link to activate your account.
                        </p>
                    </div>

                    <div style={{ 
                        background: 'var(--color-bg-secondary, #f8f9fa)', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        marginTop: '25px',
                        border: '1px solid var(--color-border, #e2e8f0)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>Next Steps:</h3>
                        <ol style={{ margin: 0, paddingLeft: '20px', color: '#555', lineHeight: '1.8' }}>
                            <li>Open your email inbox</li>
                            <li>Find the email from HR Robots</li>
                            <li>Click the "Verify Email" button</li>
                            <li>Return here to log in</li>
                        </ol>
                    </div>

                    <p style={{ 
                        marginTop: '20px', 
                        fontSize: '13px', 
                        color: '#888', 
                        textAlign: 'center' 
                    }}>
                        Didn't receive the email? Check your spam folder or contact support.
                    </p>

                    <button 
                        className="login-btn" 
                        onClick={() => navigate("/login")}
                        style={{ width: '100%', marginTop: '25px' }}
                    >
                        Go to Login
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="12,5 19,12 12,19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignupSuccess;
