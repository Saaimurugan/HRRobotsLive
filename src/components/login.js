import React, { useState, useEffect } from 'react';
import "../App.css";
import { useNavigate } from "react-router-dom";
import { GlobalProvider, useGlobalContext } from "../globalContext";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const navigate = useNavigate();
    const { globalValue, setGlobalValue } = useGlobalContext("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        setLoading(true);
        e.preventDefault();
        setMessage("");

        try {
            const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/validateCredentials", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                setMessage(data.message || "Login successful!");
                // Optionally, handle login success (e.g., redirect, save token)
                setGlobalValue(email);
                navigate("/list");
    
            } else {
                setMessage(data.message || "Login failed! email or password is incorrect.");
            }
        } catch (error) {
            setMessage("An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="containerLogin">
            <div className="login-container">
                <h1>Login</h1>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            placeholder="Enter your email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                id="password" 
                                name="password" 
                                placeholder="Enter your password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                        <button type="submit" disabled={loading}>{loading ? "Loading..." : "Login"}</button>
                    </div>
                </form>
                {message && <p className="message">{message}</p>}
                <p>Don't have an account? <a href="/signup">Sign up</a></p>
                <p><a href="/forgot-password">Forgot your password?</a></p>
            </div>
        </div>
    );
};

export default LoginPage;
