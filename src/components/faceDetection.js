import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import TimerComponent from "./timerComponent.js";

const FaceTracking = ({userUniqueID, handleFaceScore, onTimerEnd, toleranceLevel, onLoadComplete}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasInstance = useRef(null); // Ref to store the canvas instance
  const waitTimeRef = useRef(0); // Ref to store the current waitTime value
  const photoIntervalRef = useRef(null); // Ref to store the 5-minute photo capture interval
  const [isLoading, setIsLoading] = useState(false);
  //const [waitTime, setWaitTime] = useState(0);
/*   const [confidence, setConfidence] = useState(0); */

  useEffect(() => {
    // Load models
    const loadModels = async () => {
      setIsLoading(true);
      try {
        const MODEL_URL = '/models';
        // Load required models
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        //console.log("SSD Mobilenetv1 Model Loaded");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        //console.log("Face Landmark Model Loaded");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);  // Load face recognition model if needed
        //console.log("Face Recognition Model Loaded");
        await startVideo();
        capturePhoto();
        setIsLoading(false);
        if (onLoadComplete) {
          onLoadComplete(true);
        }
      } catch (error) {
        console.error("Error loading models:", error);
        setIsLoading(false);
        if (onLoadComplete) {
          onLoadComplete(false);
        }
      }
    };

    // Start video
    const startVideo = async () => {
      if (!videoRef.current) return; // Guard against null ref
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {}
        });
        if (videoRef.current) { // Check again after async operation
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error starting video:", error);
      }
    };

    const capturePhoto = async () => {

      if (!userUniqueID) {
        console.error("userUniqueID is required");
        return;
      }

      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        if (imageData) 
          {
            sendToAPI(imageData);
          }
      }
    };

    const sendToAPI = async (imageData) => {
      //console.log("Captured Image Data:", imageData);
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

    // Handle video play and detect faces
    const handleVideoPlay = () => {
      // Check if video is ready (has valid dimensions)
      if (!videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        // Video not ready yet, wait and try again
        setTimeout(handleVideoPlay, 100);
        return;
      }
      
      if (videoRef.current && !canvasInstance.current) {
        // Create the canvas only if it doesn't exist
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);
        canvasRef.current.append(canvas);
        canvasInstance.current = canvas; // Store the canvas instance

        const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
        faceapi.matchDimensions(canvas, displaySize);

        // Start detecting faces at regular intervals
        intervalRef.current = setInterval(async () => {
          // Guard: ensure video is still valid before detection
          if (!videoRef.current || !videoRef.current.videoWidth || !videoRef.current.videoHeight) {
            return;
          }
          
          try {
            const detections = await faceapi.detectAllFaces(videoRef.current)
              .withFaceLandmarks()
              .withFaceDescriptors();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            // Clear canvas using the canvas.getContext method
            const context = canvas.getContext('2d');  // Get the 2D context
            context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
            //console.log(resizedDetections);
            // Draw face landmarks manually with thin, light styling
            resizedDetections.forEach(detection => {
              const landmarks = detection.landmarks;
              const positions = landmarks.positions;
              
              context.strokeStyle = 'rgba(173, 216, 230, 0.5)';
              context.lineWidth = 1;
              context.fillStyle = 'rgba(173, 216, 230, 0.4)';
              
              // Draw small dots for each landmark point
              positions.forEach(point => {
                context.beginPath();
                context.arc(point.x, point.y, 1, 0, 2 * Math.PI);
                context.fill();
              });
              
              // Draw connecting lines for face outline
              const jawOutline = landmarks.getJawOutline();
              const nose = landmarks.getNose();
              const leftEye = landmarks.getLeftEye();
              const rightEye = landmarks.getRightEye();
              const mouth = landmarks.getMouth();
              
              const drawPath = (points) => {
                if (points.length < 2) return;
                context.beginPath();
                context.moveTo(points[0].x, points[0].y);
                points.slice(1).forEach(p => context.lineTo(p.x, p.y));
                context.stroke();
              };
              
              drawPath(jawOutline);
              drawPath(nose);
              drawPath(leftEye);
              drawPath(rightEye);
              drawPath(mouth);
            });
            const confidenceScore = detections.length > 0 ? detections[0].detection.score * 100 : 0;
            handleFaceScore(confidenceScore);

            // Increment waitTime using the ref
            waitTimeRef.current += 1;
            //setWaitTime(waitTimeRef.current); // Update state for UI purposes

            //console.log("Current waitTime:", waitTimeRef.current);

            if (confidenceScore < toleranceLevel && waitTimeRef.current >= 20) {
               capturePhoto();		  
               waitTimeRef.current = 0; // Reset waitTime after capturing photo
              }
          } catch (error) {
            // Silently handle detection errors (e.g., video not ready)
            console.warn("Face detection error:", error.message);
          }
        }, 100);
      }
    };

    // Listen for the video play event
    if (videoRef.current) {
      videoRef.current.addEventListener('play', handleVideoPlay);
    }
    setIsLoading(true);
    // Load models and start video
    loadModels();
    capturePhoto();
    setIsLoading(false);

    // Set up 5-minute interval for capturing photos during test
    photoIntervalRef.current = setInterval(() => {
      capturePhoto();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Cleanup the video stream and interval on component unmount
    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }

      // Clear the interval when the component is unmounted
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Clear the 5-minute photo capture interval
      if (photoIntervalRef.current) {
        clearInterval(photoIntervalRef.current);
      }

      // Remove event listener
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', handleVideoPlay);
      }
    };
    /*   }, [onTrackingConfidence]);*/
}, []);

const handleTimerEnd = () => {
  //console.log("Timer has ended! FaceDetection component will be closed.");
  if (onTimerEnd) {
    onTimerEnd(); // Notify the parent component
  }
};

  return (
    <>
    <div style={{ position: 'relative', display: 'inline-block' }}>

    <>
      <div ref={canvasRef} style={{ width:'100', height:'90', position: 'absolute', left: 0 }}></div>
      <video
        ref={videoRef}
        autoPlay
        muted
        width="100"
        height="90"
        style={{ display: 'block' }}
      />
    </>
    </div>
      {isLoading ? 
        <p style={{ color: 'red', fontSize: '20px', marginTop: '15px' }}>Loading...</p>
        :
        <TimerComponent onTimerEnd={handleTimerEnd} />
        }
    </>
    );
};

export default FaceTracking;
