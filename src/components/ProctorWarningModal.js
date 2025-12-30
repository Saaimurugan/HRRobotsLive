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
  onTimerExpired // New prop for when timer reaches 0
}) => {
  const isLimitExceeded = attemptCount >= maxAttempts;
  const initialTime = isLimitExceeded ? 5 : 15;
  
  const [seconds, setSeconds] = useState(initialTime);
  const intervalRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  // Start timer on mount
  useEffect(() => {
    // Capture screenshot
    captureScreenshot();
    hasTriggeredRef.current = false;
    
    // Start countdown interval
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

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle timer expiry separately to avoid closure issues
  useEffect(() => {
    if (seconds === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      if (isLimitExceeded) {
        onMaxAttemptsReached && onMaxAttemptsReached();
      } else {
        // Timer expired without clicking Return to Test - terminate
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
        fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageData,
            userUniqueID,
            captureType: warningType,
            attemptNumber: attemptCount
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
    zIndex: 10000 // Higher than other modals
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

  // Limit exceeded modal
  if (isLimitExceeded) {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <div style={{
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            backgroundColor: "#dc3545",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto 20px"
          }}>
            <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
          
          <div style={{ fontSize: "22px", fontWeight: "bold", color: "#dc3545", marginBottom: "15px" }}>
            Attempt Limit Exceeded
          </div>
          
          <div style={{ fontSize: "15px", color: "#666", marginBottom: "20px", lineHeight: "1.5" }}>
            You have exceeded the maximum allowed attempts for {warningType === "fullscreen" ? "exiting full screen mode" : "losing window focus"}.
            Your test will be terminated.
          </div>
          
          <div style={{ backgroundColor: "#f8d7da", borderRadius: "10px", padding: "20px" }}>
            <div style={{ fontSize: "14px", color: "#721c24", marginBottom: "10px" }}>
              Test terminating in
            </div>
            <div style={{ fontSize: "48px", fontWeight: "bold", color: "#dc3545" }}>
              {seconds}
            </div>
            <div style={{ fontSize: "14px", color: "#721c24", marginTop: "5px" }}>
              seconds
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal warning modal
  const warningTitle = warningType === "fullscreen" ? "Full Screen Mode Exited" : "Window Focus Lost";
  const warningMessage = warningType === "fullscreen"
    ? "You have exited full screen mode. Please return to full screen to continue the test."
    : "You have switched away from the test window. Please return focus to continue.";

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={{
          width: "70px",
          height: "70px",
          borderRadius: "50%",
          backgroundColor: "#ffc107",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "0 auto 20px"
        }}>
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        
        <div style={{ fontSize: "22px", fontWeight: "bold", color: "#333", marginBottom: "15px" }}>
          {warningTitle}
        </div>
        
        <div style={{ fontSize: "15px", color: "#666", marginBottom: "20px", lineHeight: "1.5" }}>
          {warningMessage}
        </div>
        
        <div style={{ backgroundColor: "#f8f9fa", borderRadius: "10px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: seconds <= 5 ? "#dc3545" : "#007bff" }}>
            {seconds}
          </div>
          <div style={{ fontSize: "14px", color: "#888", marginTop: "5px" }}>
            seconds remaining
          </div>
        </div>
        
        <div style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
          Attempt {attemptCount} of {maxAttempts}
        </div>
        
        <button
          onClick={handleReturnToTest}
          style={{
            padding: "14px 40px",
            fontSize: "16px",
            fontWeight: "600",
            color: "#fff",
            backgroundColor: "#007bff",
            border: "none",
            borderRadius: "25px",
            cursor: "pointer"
          }}
        >
          Return to Test
        </button>
      </div>
    </div>
  );
};

export default ProctorWarningModal;
