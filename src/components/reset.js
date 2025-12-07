import React, { useState, useEffect } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { GlobalProvider, useGlobalContext } from "../globalContext";

const ResetPage = () => {
    const [ForgotPasswordID, setForgotPasswordID] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const navigate = useNavigate();
    const { globalValue, setGlobalValue } = useGlobalContext(false);  
    const [loading, setLoading] = useState(false);

    const validatePassword = (password) => {
        //const passwordRegex = /^.{8,}$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    };

    useEffect(() => {
        // Extract the value from the URL
        const url = window.location.href; // Get the full URL
        const parts = url.split('/'); // Split the URL by '/'
        const value = parts[parts.length - 1]; // Get the last part of the URL
    
        if (value != '')
        {
            setForgotPasswordID(value);
        }
        else
        {
            navigate("/login");
            return;
        }

    }, []); // Run only once on component mount

    const resetPassword = async (e) => {
        setLoading(true);
        e.preventDefault();
        setMessage("");

        if (!validatePassword(password)) {
            setPasswordError("Password must be at least 8 characters, include uppercase, lowercase, number, and special character.");
            return;
        }

        if (password !== confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        } else {
            setPasswordError("");
        }

        try {
            const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/resetPassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ForgotPasswordID, password }),
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                setMessage(data.message || "Password reset successful!");
                navigate("/login");
            } else {
                setMessage(data.message || "Password reset failed. Please try again.");
            }
        } catch (error) {
            setMessage("An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
        if (confirmPassword && e.target.value !== confirmPassword) {
            setPasswordError("Passwords do not match");
        } else {
            setPasswordError("");
        }

        if (!validatePassword(password)) {
            setPasswordError("Password must be at least 8 characters, include uppercase, lowercase, number, and special character.");
            return;
        }
    };

    const handleConfirmPasswordChange = (e) => {
        setConfirmPassword(e.target.value);
        if (password && e.target.value !== password) {
            setPasswordError("Passwords do not match");
        } else {
            setPasswordError("");
        }

        if (!validatePassword(e.target.value)) {
            setPasswordError("Password must be at least 8 characters, include uppercase, lowercase, number, and special character.");
            return;
        }
    };
   
    return (
        <div className="containerLogin">
            <div className="login-container">
                <h1>Reset Password</h1>
                <form onSubmit={resetPassword}>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                        <input 
                                type={showPassword ? "text" : "password"} 
                                id="password" 
                                name="password" 
                                placeholder="Enter your password" 
                                value={password}
                                onChange={handlePasswordChange}
                                required 
                                style={{ flex: 14 }}												   
                            />
                            <button 
                                type="button" 
                                className="toggle-password" 
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label="Toggle password visibility"
                                style={{ color:'black', flex: 1, marginLeft: '5px', background: '#E8F0FE', border: '0.5px #ccc', cursor: 'pointer' }}																															  
                            >
                             {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye-off">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C7.58 19 3.73 16.11 1.65 12.07a.54.54 0 0 1 0-.14A10.94 10.94 0 0 1 4.55 6.14" />
                                        <path d="M1 1l22 22" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-eye">
                                        <path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={handleConfirmPasswordChange}
                            required
                        />
                    </div>
                    {passwordError && <p style={{color:'red'}} className="error-message">{passwordError}</p>}
                    <div className="form-group">
                        <button type="submit" disabled={loading}>{loading ? "Loading..." : "Reset Password"}</button>
                    </div>
                </form>
                {message && <p className="message">{message}</p>}
            </div>
        </div>
    );
};

export default ResetPage;
