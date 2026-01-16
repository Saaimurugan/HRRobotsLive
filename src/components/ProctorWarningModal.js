import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";

const ProctorWarningModal = ({
  isVisible,
  warningType,
  attemptCount,
  maxAttempts = 3,
  userUniqueID,
  onReturnToTest,
  onMaxAttemptsReached,
  onTimerExpired
}) => {
  const isLimitExceeded = attemptCount >= maxAttempts;
  const initialTime = isLimitExceeded ? 5 : 15;
  
  const [seconds, setSeconds] = useState(initialTime);
  const intervalRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    captureScreenshot();
    hasTriggeredRef.current = false;
    
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
      if (isLimitExceeded) {
        onMaxAttemptsReached && onMaxAttemptsReached();
      } else {
        onTimerExpired && onTimerExpired();
      }
    }
  }, [seconds, isLimitExceeded, onMaxAttemptsReached, onTimerExpired]);

  const captureScreenshot = async () => {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 0.5
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.7);
      
      if (userUniqueID) {
        fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto_", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageData,
            userUniqueID,
            captureType: warningType,
            attemptNumber: attemptCount,
            outputQuality: 100  // High quality for screenshots
          }),
        }).catch(() => {});
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleReturnToTest = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    hasTriggeredRef.current = true;
    onReturnToTest && onReturnToTest();
  };

  if (!isVisible) return null;

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
    zIndex: 10000
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
    backgroundColor: isLimitExceeded ? "#dc3545" : "#ffc107",
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
    backgroundColor: isLimitExceeded ? "#f8d7da" : "#f8f9fa",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px"
  };

  const countdownNumberStyle = {
    fontSize: "48px",
    fontWeight: "bold",
    color: seconds <= 5 ? "#dc3545" : "#007bff"
  };

  const countdownLabelStyle = {
    fontSize: "14px",
    color: isLimitExceeded ? "#721c24" : "#888",
    marginTop: "5px"
  };

  const attemptStyle = {
    fontSize: "14px",
    color: "#666",
    marginBottom: "20px"
  };

  const buttonStyle = {
    padding: "14px 40px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#007bff",
    border: "none",
    borderRadius: "25px",
    cursor: "pointer"
  };

  const warningTitle = warningType === "fullscreen" ? "Full Screen Mode Exited" : "Window Focus Lost";
  const warningMessage = warningType === "fullscreen"
    ? "You have exited full screen mode. Please return to full screen to continue the test."
    : "You have switched away from the test window. Please return focus to continue.";

  // Limit exceeded modal
  if (isLimitExceeded) {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <div style={iconStyle}>
            <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
          <div style={headerStyle}>Attempt Limit Exceeded</div>
          <div style={textStyle}>
            You have exceeded the maximum allowed attempts for {warningType === "fullscreen" ? "exiting full screen mode" : "losing window focus"}.
            Your test will be terminated.
          </div>
          <div style={infoBoxStyle}>
            <div style={bulletItemStyle}>
              <span style={bulletStyle}>•</span>
              <span>Maximum attempts ({maxAttempts}) have been reached.</span>
            </div>
            <div style={{...bulletItemStyle, marginBottom: 0}}>
              <span style={bulletStyle}>•</span>
              <span>Your test will be automatically terminated.</span>
            </div>
          </div>
          <div style={countdownBoxStyle}>
            <div style={{fontSize: "14px", color: "#721c24", marginBottom: "10px"}}>
              Test terminating in
            </div>
            <div style={{...countdownNumberStyle, color: "#dc3545"}}>
              {seconds}
            </div>
            <div style={countdownLabelStyle}>
              seconds
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal warning modal
  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div style={headerStyle}>{warningTitle}</div>
        <div style={textStyle}>{warningMessage}</div>
        <div style={infoBoxStyle}>
          <div style={bulletItemStyle}>
            <span style={bulletStyle}>•</span>
            <span>The total number of allowed deviations is {maxAttempts}. You have violated {attemptCount} time{attemptCount > 1 ? 's' : ''}.</span>
          </div>
          <div style={{...bulletItemStyle, marginBottom: 0}}>
            <span style={bulletStyle}>•</span>
            <span>{warningType === "fullscreen" ? "Click the button below to return to full screen mode." : "Click the button below to continue the test."}</span>
          </div>
        </div>
        <div style={countdownBoxStyle}>
          <div style={countdownNumberStyle}>
            {seconds}
          </div>
          <div style={countdownLabelStyle}>
            seconds remaining
          </div>
        </div>
        <div style={attemptStyle}>
          Attempt {attemptCount} of {maxAttempts}
        </div>
        <button onClick={handleReturnToTest} style={buttonStyle}>
          Return to Test
        </button>
      </div>
    </div>
  );
};

export default ProctorWarningModal;
