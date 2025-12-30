import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";

const ProctorWarningModal = ({
  isVisible,
  warningType, // 'fullscreen' or 'focus'
  attemptCount,
  maxAttempts = 3,
  userUniqueID,
  onReturnToTest,
  onMaxAttemptsReached
}) => {
  const [countdown, setCountdown] = useState(15);
  const screenshotTakenRef = useRef(false);

  // Capture screenshot when modal becomes visible
  useEffect(() => {
    if (isVisible && !screenshotTakenRef.current) {
      captureScreenshot();
      screenshotTakenRef.current = true;
    }
    
    if (!isVisible) {
      screenshotTakenRef.current = false;
      setCountdown(15);
    }
  }, [isVisible]);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-trigger max attempts if countdown reaches 0
          if (attemptCount >= maxAttempts) {
            onMaxAttemptsReached && onMaxAttemptsReached();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, attemptCount, maxAttempts, onMaxAttemptsReached]);

  const captureScreenshot = async () => {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 0.5 // Reduce size for faster capture
      });
      
      const imageData = canvas.toDataURL("image/jpeg", 0.7);
      await sendScreenshotToAPI(imageData);
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    }
  };

  const sendScreenshotToAPI = async (imageData) => {
    if (!userUniqueID) return;
    
    try {
      await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          userUniqueID,
          captureType: warningType,
          attemptNumber: attemptCount
        }),
      });
    } catch (error) {
      console.error("Error sending screenshot:", error);
    }
  };

  const handleReturnToTest = () => {
    if (attemptCount >= maxAttempts) {
      onMaxAttemptsReached && onMaxAttemptsReached();
    } else {
      onReturnToTest && onReturnToTest();
    }
  };

  if (!isVisible) return null;

  const warningTitle = warningType === "fullscreen" 
    ? "Full Screen Mode Exited" 
    : "Window Focus Lost";

  const warningMessage = warningType === "fullscreen"
    ? "You have exited full screen mode. Please return to full screen to continue the test."
    : "You have switched away from the test window. Please return focus to continue.";

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
    backgroundColor: attemptCount >= maxAttempts ? "#dc3545" : "#ffc107",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 20px"
  };

  const titleStyle = {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "15px"
  };

  const messageStyle = {
    fontSize: "15px",
    color: "#666",
    marginBottom: "20px",
    lineHeight: "1.5"
  };

  const countdownContainerStyle = {
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px"
  };

  const countdownNumberStyle = {
    fontSize: "48px",
    fontWeight: "bold",
    color: countdown <= 5 ? "#dc3545" : "#007bff"
  };

  const countdownLabelStyle = {
    fontSize: "14px",
    color: "#888",
    marginTop: "5px"
  };

  const attemptStyle = {
    fontSize: "14px",
    color: attemptCount >= maxAttempts ? "#dc3545" : "#666",
    marginBottom: "20px",
    fontWeight: attemptCount >= maxAttempts ? "bold" : "normal"
  };

  const buttonStyle = {
    padding: "14px 40px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff",
    backgroundColor: attemptCount >= maxAttempts ? "#6c757d" : "#007bff",
    border: "none",
    borderRadius: "25px",
    cursor: attemptCount >= maxAttempts ? "not-allowed" : "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0, 123, 255, 0.3)"
  };

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        
        <div style={titleStyle}>{warningTitle}</div>
        <div style={messageStyle}>{warningMessage}</div>
        
        <div style={countdownContainerStyle}>
          <div style={countdownNumberStyle}>{countdown}</div>
          <div style={countdownLabelStyle}>seconds remaining</div>
        </div>
        
        <div style={attemptStyle}>
          Attempt {attemptCount} of {maxAttempts}
          {attemptCount >= maxAttempts && " - Maximum attempts reached!"}
        </div>
        
        <button
          style={buttonStyle}
          onClick={handleReturnToTest}
          disabled={attemptCount >= maxAttempts}
          onMouseOver={(e) => {
            if (attemptCount < maxAttempts) {
              e.target.style.backgroundColor = "#0056b3";
              e.target.style.transform = "translateY(-2px)";
            }
          }}
          onMouseOut={(e) => {
            if (attemptCount < maxAttempts) {
              e.target.style.backgroundColor = "#007bff";
              e.target.style.transform = "translateY(0)";
            }
          }}
        >
          Return to Test
        </button>
      </div>
    </div>
  );
};

export default ProctorWarningModal;
