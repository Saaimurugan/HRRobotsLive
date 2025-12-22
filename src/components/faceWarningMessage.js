import React, { useEffect, useRef } from "react";

const FaceWarningMessage = ({count, offFocus, userUniqueID, warningType = "noface"}) => {
  const videoRef = useRef(null);
  const photoCapturedRef = useRef(false);

  const capturePhoto = async () => {
    if (!userUniqueID) {
      console.error("userUniqueID is required");
      return;
    }

    // Get video element from the existing face detection video
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
      console.error('Error sending image:', error);
    }
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
  };

  const listStyle = {
    fontSize: "16px",
    textAlign: "left",
  };

  // Capture photo when warning message is displayed
  useEffect(() => {
    if (!photoCapturedRef.current) {
      capturePhoto();
      photoCapturedRef.current = true;
    }
  }, [userUniqueID]);

  const renderWarningContent = () => {
    if (warningType === "multiplefaces") {
      return (
        <>
          <div style={headerStyle}>Warning</div>
          <div style={textStyle}>Multiple faces have been detected on the camera.</div>
          <ul>
            <li style={listStyle}>The total number of allowed deviations is 10. Multiple faces have been detected {count} times.</li>
            <li style={listStyle}>Please ensure only one person is visible in the camera frame.</li>
          </ul>
        </>
      );
    }
    
    // Default: no face warning
    if (offFocus <= 1 && count === 0) {
      return (
        <>
          <div style={headerStyle}>Please Wait</div>
          <div style={textStyle}>The test will begin once the facial recognition process has finished loading.</div>
          <ul>
            <li style={listStyle}>Please ensure your face is centered in the video capture.</li>
          </ul>
        </>
      );
    }
    
    return (
      <>
        <div style={headerStyle}>Warning</div>
        <div style={textStyle}>The test is passed because the face is not properly focused on the screen.</div>
        <ul>
          <li style={listStyle}>The total number of allowed focus deviations is 10. You have been out of focus {count} times.</li>
        </ul>
      </>
    );
  };

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        {renderWarningContent()}
      </div>
    </div>
  );
};

export default FaceWarningMessage;
