import React, { useState, useEffect, useRef } from "react";

const FaceWarningMessage = ({count, offFocus, userUniqueID, warningType = "noface", maxAttempts = 10, onReturnToTest}) => {
  const [seconds, setSeconds] = useState(15);
  const intervalRef = useRef(null);
  const photoCapturedRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  const capturePhoto = async () => {
    if (!userUniqueID) return;

    const existingVideo = document.querySelector('video');
    if (existingVideo) {
      const canvas = document.createElement('canvas');
      canvas.width = existingVideo.videoWidth;
      canvas.height = existingVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(existingVideo, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');
      if (imageData) {
        sendToAPI(imageData);
      }
    }
  };

  const sendToAPI = async (imageData) => {
    try {
      await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, userUniqueID }),
      });
    } catch (error) {
      // Silent fail
    }
  };

  // Start timer and capture photo on mount
  useEffect(() => {
    if (!photoCapturedRef.current) {
      capturePhoto();
      photoCapturedRef.current = true;
    }
    
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

  const handleReturnToTest = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    hasTriggeredRef.current = true;
    onReturnToTest && onReturnToTest();
  };

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  };

  const containerStyle = {
    backgroundColor: "#ffcccb",
    color: "#a94442",
    border: "1px solid #ebccd1",
    padding: "20px",
    borderRadius: "5px",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
  };

  const headerStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px"
  };

  const textStyle = {
    fontSize: "16px",
    marginBottom: "15px"
  };

  const listStyle = {
    fontSize: "16px",
    textAlign: "left",
    marginBottom: "5px"
  };

  const countdownStyle = {
    fontSize: "14px",
    marginTop: "15px",
    marginBottom: "15px"
  };

  const countdownNumberStyle = {
    fontSize: "32px",
    fontWeight: "bold",
    color: seconds <= 5 ? "#dc3545" : "#a94442"
  };

  const buttonStyle = {
    padding: "10px 30px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#a94442",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    marginTop: "10px"
  };

  // Loading state - no countdown needed
  if (offFocus <= 1 && count === 0) {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>Please Wait</div>
          <div style={textStyle}>The test will begin once the facial recognition process has finished loading.</div>
          <ul>
            <li style={listStyle}>Please ensure your face is centered in the video capture.</li>
          </ul>
        </div>
      </div>
    );
  }

  // Multiple faces warning
  if (warningType === "multiplefaces") {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <div style={headerStyle}>Warning</div>
          <div style={textStyle}>Multiple faces have been detected on the camera.</div>
          <ul>
            <li style={listStyle}>The total number of allowed deviations is {maxAttempts}. Multiple faces have been detected {count} time{count > 1 ? 's' : ''}.</li>
            <li style={listStyle}>Please ensure only one person is visible in the camera frame.</li>
          </ul>
          <div style={countdownStyle}>
            Time remaining: <span style={countdownNumberStyle}>{seconds}</span> seconds
          </div>
          {onReturnToTest && (
            <button onClick={handleReturnToTest} style={buttonStyle}>
              Return to Test
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Face not focused warning
  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>Warning</div>
        <div style={textStyle}>The test is paused because the face is not properly focused on the screen.</div>
        <ul>
          <li style={listStyle}>The total number of allowed focus deviations is {maxAttempts}. You have been out of focus {count} time{count > 1 ? 's' : ''}.</li>
          <li style={listStyle}>Please ensure your face is visible and centered in the camera.</li>
        </ul>
        <div style={countdownStyle}>
          Time remaining: <span style={countdownNumberStyle}>{seconds}</span> seconds
        </div>
        {onReturnToTest && (
          <button onClick={handleReturnToTest} style={buttonStyle}>
            Return to Test
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceWarningMessage;
