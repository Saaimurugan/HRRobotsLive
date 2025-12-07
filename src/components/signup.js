import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { GlobalProvider, useGlobalContext } from "../globalContext";

const SignUp = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const navigate = useNavigate();
    const { globalValue, setGlobalValue } = useGlobalContext();  
    const [loading, setLoading] = useState(false);

    const validateEmail = (email) => {
        const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/i;
        //const emailRegex = /^[^\s@]+@((gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com|aol\.com)|[^\s@]+\.[^\s@]+)$/i;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        //const passwordRegex = /^.{8,}$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    };

    const handleLogin = async (e) => {
        setLoading(true);
        e.preventDefault();
        setMessage("");

        try {
            const checkEmailResponse = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/checkEmail", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });
    
            const data = await checkEmailResponse.json();
    
            if (data.statusCode === 200) {
                setEmailError("");
            } else {
                setEmailError("Email is already registered. Please use a different email.");
                return;
            }
        } catch (error) {
            setEmailError("An error occurred while checking the email. Please try again later.");
            return;
        }

        if (!validateEmail(email)) {
            setEmailError("Only official E-mails are allowed or Invalid email format");
            return;
        } else {
            setEmailError("");
        }

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
            const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/userDetailsCURD", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                setMessage(data.message || "Login successful!");
                setGlobalValue(email);
                navigate("/list");
            } else {
                setMessage(data.message || "Login failed. Please try again.");

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
   
    const handleEmailChange = (e) => {
        const personalEmailDomains = [
            "gmail.com",
            "yahoo.com",
            "hotmail.com",
            "outlook.com",
            "aol.com",
            "icloud.com",
            "protonmail.com",
            "zohomail.in.com",
            "mail.com",
            "gmx.com",
            "yandex.com",
            "tutanota.com",
            "fastmail.com",
            "live.com",
            "msn.com",
            "qq.com",
            "naver.com",
            "rediffmail.com",
            "rambler.ru",
            "seznam.cz",
            "freenet.de",
            "web.de",
            "orange.fr",
            "libero.it",
            "virgilio.it",
            "hushmail.com",
            "163.com",
            "126.com",
            "sina.com",
            "lycos.com"
        ];
    
        const isPersonalEmail = (email) => {
            const domain = email.split('@')[1];
            return personalEmailDomains.includes(domain);
        };
    
        const newEmail = e.target.value;
        setEmail(newEmail);
    
        if (!validateEmail(newEmail)) {
            setEmailError("Invalid email format");
            return;
        } else if (isPersonalEmail(newEmail)) {
            setEmailError("Personal emails are not allowed. Please use an official email.");
            return;
        } else {
            setEmailError("");
        }
    };

    // const handleEmailChange = (e) => {
    //     setEmail(e.target.value)
    //     if (!validateEmail(e.target.value)) {
    //         setEmailError("Only official E-mails are allowed or Invalid email format");
    //         return;
    //     } else {
    //         setEmailError("");
    //     }
    // };

    return (
        <div className="containerLogin">
            <div className="login-container">
                <h1>SignUp</h1>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={handleEmailChange}
                            required
                        />
{/*                         {emailError && <p className="error-message">{emailError}</p>}
 */}                    </div>
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
                    {emailError && <p style={{color:'red'}} className="error-message">{emailError}</p>}
                    
                    <div className="form-group">
                        <button type="submit" disabled={loading || emailError !== "" || passwordError !== ""}>
                            {loading ? "Loading..." : "Sign up"}
                        </button>
                    </div>
                </form>
                {message && <p className="message">{message}</p>}
                <p>Already have an account? <a href="/login">Sign in</a></p>
            </div>
        </div>
    );
};

export default SignUp;
