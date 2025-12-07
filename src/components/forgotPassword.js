import React, { useState, useEffect } from 'react';
import "../App.css";
import { useNavigate } from "react-router-dom";
import { GlobalProvider, useGlobalContext } from "../globalContext";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();
    const { globalValue, setGlobalValue } = useGlobalContext(false);  
    const [loading, setLoading] = useState(false);

       useEffect(() => {
          if (globalValue !== "") {
           // Call the async function
           console.log(globalValue);
           setEmail(globalValue);
        }
       }, [globalValue, navigate]);

    const handleForgotPassword = async (e) => {
        setLoading(true);
        e.preventDefault();
        setMessage("");

        try {
            const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/forgotPassword", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({
                  recipient_email: email
               }),
            });

            const data = await response.json();

            if (data.statusCode === 200) {
                setMessage(data.message || "Request change password successful!");
                navigate("/login");    
            } else {
                setMessage("");
            }
        } catch (error) {
            setMessage("An error occurred. Please try again later.");
        } finally {
            setLoading(false);
            setMessage("Please check your email for the reset link.");
        }
    };

    return (
        <div className="containerLogin">
            <div className="login-container">
                <h1>Request Change Password</h1>
                <form onSubmit={handleForgotPassword}>
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
                            disabled={globalValue !== ""}
                        />
                    </div>
                    <div className="form-group">
                        <button type="submit" disabled={loading}>{loading ? "Loading..." : "Request"}</button>
                    </div>
                </form>
                {message && <p className="message" style={{"color": "blue"}}>{message}</p>}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
