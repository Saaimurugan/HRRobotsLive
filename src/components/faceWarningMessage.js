import React, { useState, useEffect, useRef } from "react";

const FaceWarningMessage = ({count, offFocus, userUniqueID}) => {
  const videoRef = useRef(null);

  // const capturePhoto = async () => {

  //   if (!userUniqueID) {
  //     console.error("userUniqueID is required");
  //     return;
  //   }
  
  //   if (videoRef.current) {
  //     const canvas = document.createElement('canvas');
  //     canvas.width = videoRef.current.videoWidth;
  //     canvas.height = videoRef.current.videoHeight;
  //     const ctx = canvas.getContext('2d');
  //     ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  //     const imageData = canvas.toDataURL('image/jpeg');
  //     if (imageData) 
  //       {
  //         sendToAPI(imageData);
  //       }
  //   }
  // };

  // const sendToAPI = async (imageData) => {
  //   console.log("Captured Image Data:", imageData);
  //   try {
  //     await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ image: imageData, userUniqueID }),
  //     });
  //   } catch (error) {
  //     console.error('Error sending image:', error);
  //   }
  // };

  const containerStyle = {
    backgroundColor: "#ffcccb",
    color: "#a94442",
    border: "1px solid #ebccd1",
    padding: "20px",
    borderRadius: "5px",
    maxWidth: "400px",
    textAlign: "center",
    margin: "20px auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
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

  // useEffect(() => {
  //   capturePhoto();
  // }, [userUniqueID]);

  return (
    <div style={containerStyle}>
      {
      offFocus <= 1 && count === 0?
      <>
      <div style={headerStyle}>Please Wait</div>
      <div style={textStyle}>The test will begin once the facial recognition process has finished loading.</div>
      <ul>
        <li style={listStyle}>Please ensure your face is centered in the video capture.</li>
      </ul>
      </>
      :
      <>
      <div style={headerStyle}>Warning</div>
      <div style={textStyle}>The test is passed because the face is not properly focused on the screen.</div>
      <ul>
        <li style={listStyle}>The total number of allowed focus deviations is 10. You have been out of focus {count} times.</li>
      </ul>
      </>
      }
    </div>
  );
};

export default FaceWarningMessage;
