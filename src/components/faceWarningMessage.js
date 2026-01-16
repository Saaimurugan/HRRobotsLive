import React, { useEffect, useRef } from "react";

const FaceWarningMessage = ({count, offFocus, userUniqueID, warningType = "noface", maxAttempts = 10}) => {
  const photoCapturedRef = useRef(false);

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
      await fetch('https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto_', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, userUniqueID, outputQuality: 5 }),  // Low quality for face photos
      });
    } catch (error) {
      // Silent fail
    }
  };

  useEffect(() => {
    if (!photoCapturedRef.current) {
      capturePhoto();
      photoCapturedRef.current = true;
    }
  }, [userUniqueID]);

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
    backgroundColor: "#ffc107",
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
    textAlign: "left"
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

  // Loading state
  if (offFocus <= 1 && count === 0) {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <div style={iconStyle}>
            <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <div style={headerStyle}>Please Wait</div>
          <div style={textStyle}>
            The test will begin once the facial recognition process has finished loading.
          </div>
          <div style={infoBoxStyle}>
            <div style={{...bulletItemStyle, marginBottom: 0}}>
              <span style={bulletStyle}>•</span>
              <span>Please ensure your face is centered in the video capture.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple faces warning
  if (warningType === "multiplefaces") {
    return (
      <div style={overlayStyle}>
        <div style={containerStyle}>
          <div style={iconStyle}>
            <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <div style={headerStyle}>Multiple Faces Detected</div>
          <div style={textStyle}>
            Multiple faces have been detected on the camera.
          </div>
          <div style={infoBoxStyle}>
            <div style={bulletItemStyle}>
              <span style={bulletStyle}>•</span>
              <span>The total number of allowed deviations is {maxAttempts}. Multiple faces have been detected {count} time{count > 1 ? 's' : ''}.</span>
            </div>
            <div style={{...bulletItemStyle, marginBottom: 0}}>
              <span style={bulletStyle}>•</span>
              <span>Please ensure only one person is visible in the camera frame.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Face not focused warning
  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <div style={headerStyle}>Face Not Detected</div>
        <div style={textStyle}>
          The test is paused because the face is not properly focused on the screen.
        </div>
        <div style={infoBoxStyle}>
          <div style={bulletItemStyle}>
            <span style={bulletStyle}>•</span>
            <span>The total number of allowed focus deviations is {maxAttempts}. You have been out of focus {count} time{count > 1 ? 's' : ''}.</span>
          </div>
          <div style={{...bulletItemStyle, marginBottom: 0}}>
            <span style={bulletStyle}>•</span>
            <span>Please ensure your face is visible and centered in the camera.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceWarningMessage;
