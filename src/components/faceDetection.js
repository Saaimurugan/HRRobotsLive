import React, { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';
import TimerComponent from "./timerComponent.js";
import AudioWaveOverlay from "./AudioWaveOverlay.js";
import modelPreloader from '../services/modelPreloader.js';

const FaceTracking = ({
  userUniqueID, 
  handleFaceScore, 
  onTimerEnd, 
  toleranceLevel, 
  onLoadComplete,
  onMultipleFacesDetected, // Callback when multiple faces are detected
  // Audio detection props
  audioVolume = 0,
  isTalking = false,
  speechCount = 0,
  isAudioListening = false,
  // Timer control
  isFirstQuestionLoaded = false,
  // Configuration props
  testDuration = 60, // Test duration in minutes (default 60)
  sensitivityLevel = 5 // Sensitivity level in seconds (default 5)
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasInstance = useRef(null); // Ref to store the canvas instance
  const waitTimeRef = useRef(0); // Ref to store the current waitTime value
  const photoIntervalRef = useRef(null); // Ref to store the 5-minute photo capture interval
  const multipleFaceStartRef = useRef(null); // Ref to track when multiple faces started being detected
  const lastPhotoCaptureRef = useRef(null); // Ref to track last photo capture time
  const [isLoading, setIsLoading] = useState(false);
  //const [waitTime, setWaitTime] = useState(0);
/*   const [confidence, setConfidence] = useState(0); */

  useEffect(() => {
    // Load models
    const loadModels = async () => {
      setIsLoading(true);
      try {
        // Check if models are already preloaded
        if (modelPreloader.isLoaded()) {
          // console.log('Using preloaded face-api.js models');
          await startVideo();
          capturePhoto('initial'); // Mark as initial capture
          setIsLoading(false);
          if (onLoadComplete) {
            onLoadComplete(true);
          }
          return;
        }

        // If not preloaded, load them now (fallback)
        // console.log('Models not preloaded, loading now...');
        await modelPreloader.loadModels();
        // console.log("Face-api.js models loaded successfully");
        await startVideo();
        capturePhoto('initial'); // Mark as initial capture
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
        //console.error("Error starting video:", error);
      }
    };

    const capturePhoto = async (captureType = 'routine') => {
      if (!userUniqueID) {
        //console.error("userUniqueID is required");
        return;
      }

      // Prevent duplicate captures within 30 seconds (except for initial capture)
      const now = Date.now();
      const minInterval = captureType === 'initial' ? 0 : 30000; // 30 seconds minimum between captures
      
      if (lastPhotoCaptureRef.current && (now - lastPhotoCaptureRef.current) < minInterval) {
        //console.log(`Photo capture skipped - too soon (${captureType})`);
        return;
      }

      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        if (imageData) {
          lastPhotoCaptureRef.current = now; // Update last capture time
          sendToAPI(imageData, captureType);
        }
      }
    };

    const sendToAPI = async (imageData, captureType = 'routine') => {
      //console.log("Captured Image Data:", imageData);
      try {
        await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: imageData, 
            userUniqueID, 
            outputQuality: 5,
            captureType: captureType // Add capture type for backend tracking
          }),
        });
      } catch (error) {
        //console.error('Error sending image:', error);
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

            // Check for multiple faces detected
            if (detections.length > 1) {
              // Multiple faces detected
              if (multipleFaceStartRef.current === null) {
                // Start tracking multiple faces
                multipleFaceStartRef.current = Date.now();
              } else {
                // Check if sensitivityLevel seconds have passed with multiple faces
                const elapsedTime = Date.now() - multipleFaceStartRef.current;
                if (elapsedTime >= sensitivityLevel * 1000) {
                  // Trigger multiple faces warning callback
                  if (onMultipleFacesDetected) {
                    onMultipleFacesDetected(detections.length);
                  }
                  capturePhoto('multiple_faces'); // Capture photo when multiple faces detected
                  multipleFaceStartRef.current = Date.now(); // Reset timer after triggering
                }
              }
            } else {
              // Single face or no face - reset multiple face tracking
              multipleFaceStartRef.current = null;
            }

            // Increment waitTime using the ref
            waitTimeRef.current += 1;
            //setWaitTime(waitTimeRef.current); // Update state for UI purposes

            //console.log("Current waitTime:", waitTimeRef.current);

            if (confidenceScore < toleranceLevel && waitTimeRef.current >= 20) {
               capturePhoto('low_confidence'); // Mark as low confidence capture
               waitTimeRef.current = 0; // Reset waitTime after capturing photo
              }
          } catch (error) {
            // Silently handle detection errors (e.g., video not ready)
            //console.warn("Face detection error:", error.message);
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
    // Remove redundant capturePhoto call here - it's already called in loadModels
    setIsLoading(false);

    // Set up 5-minute interval for capturing photos during test
    photoIntervalRef.current = setInterval(() => {
      capturePhoto('interval'); // Mark as interval capture
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

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
        style={{ display: 'block', borderRadius: '4px' }}
      />
      {/* Audio Wave Overlay */}
      <AudioWaveOverlay 
        volume={audioVolume}
        isTalking={isTalking}
        speechCount={speechCount}
        isListening={isAudioListening}
        width={100}
        height={90}
        barCount={5}
        showCount={true}
      />
      {/* Timer overlay on video for mobile */}
      {isMobile && !isLoading && isFirstQuestionLoaded && (
        <div style={{
          position: 'absolute',
          top: '2px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}>
          <TimerComponent 
            onTimerEnd={handleTimerEnd} 
            testDuration={testDuration} 
            startTimer={isFirstQuestionLoaded}
          />
        </div>
      )}
    </>
    </div>
      {isLoading ? 
        <p style={{ color: 'red', fontSize: '20px', marginTop: '15px' }}>Loading...</p>
        :
        !isMobile && isFirstQuestionLoaded ? 
          <TimerComponent 
            onTimerEnd={handleTimerEnd} 
            testDuration={testDuration} 
            startTimer={isFirstQuestionLoaded}
          /> : null
        }
    </>
    );
};

export default FaceTracking;
