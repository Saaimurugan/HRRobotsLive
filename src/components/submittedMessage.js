import React, { useState, useEffect, useRef } from "react";

const SubmittedMessage = ({ onComplete }) => {
  const [seconds, setSeconds] = useState(5);
  const intervalRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (seconds === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      onComplete && onComplete();
    }
  }, [seconds, onComplete]);

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  };

  const containerStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "30px 40px",
    maxWidth: "450px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)"
  };

  const iconStyle = {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "#28a745",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 20px"
  };

  const headerStyle = {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "15px"
  };

  const textStyle = {
    fontSize: "15px",
    color: "#666",
    marginBottom: "20px",
    lineHeight: "1.5"
  };

  const infoBoxStyle = {
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    padding: "15px 20px",
    textAlign: "left",
    marginBottom: "20px"
  };

  const bulletItemStyle = {
    display: "flex",
    fontSize: "14px",
    color: "#666",
    marginBottom: "8px",
    lineHeight: "1.4"
  };

  const bulletStyle = {
    marginRight: "8px",
    flexShrink: 0
  };

  const countdownBoxStyle = {
    backgroundColor: "#d4edda",
    borderRadius: "10px",
    padding: "20px"
  };

  const countdownNumberStyle = {
    fontSize: "48px",
    fontWeight: "bold",
    color: "#28a745"
  };

  const countdownLabelStyle = {
    fontSize: "14px",
    color: "#155724",
    marginTop: "5px"
  };

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        <div style={headerStyle}>Submission Successful</div>
        <div style={textStyle}>
          Your test has been successfully submitted to the recruitment company for evaluation.
        </div>
        <div style={infoBoxStyle}>
          <div style={bulletItemStyle}>
            <span style={bulletStyle}>•</span>
            <span>Your answers have been recorded and sent for review.</span>
          </div>
          <div style={{...bulletItemStyle, marginBottom: 0}}>
            <span style={bulletStyle}>•</span>
            <span>Please wait, you will be redirected automatically.</span>
          </div>
        </div>
        <div style={countdownBoxStyle}>
          <div style={{fontSize: "14px", color: "#155724", marginBottom: "10px"}}>
            Redirecting in
          </div>
          <div style={countdownNumberStyle}>
            {seconds}
          </div>
          <div style={countdownLabelStyle}>
            seconds
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmittedMessage;
