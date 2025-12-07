import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const CameraCapture = ({ userUniqueID }) => {
  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Capture the image from the webcam
  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    uploadImage(imageSrc);
  };

  // Upload image to the server
  const uploadImage = async (imageSrc) => {
    try {
      const blob = await fetch(imageSrc).then((res) => res.blob());
      const formData = new FormData();
      formData.append("image", blob, `${userUniqueID}.png`);

      const response = await axios.post(
        "https://www.hrrobots.click/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      //console.log("Image uploaded successfully:", response.data);
    } catch (error) {
      //console.error("Error uploading image:", error);
    }
  };

  // Set up an interval to capture images every 15 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      capture();
    }, 15000); // 15000 milliseconds = 15 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  return (
    <div style={{marginTop: "7px"}}>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/png"
        width={100}
        height={90}
      />
      {/* <button onClick={capture}>Capture Image</button> */}
      {/* {capturedImage && <img src={capturedImage} alt="Captured" />} */}
    </div>
  );
};

export default CameraCapture;
