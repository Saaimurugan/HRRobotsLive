import React, { useState, useEffect, useRef } from "react";
import CameraCapture from './cam.js';
import WarningMessage from "./warningMessage.js";
import FaceWarningMessage from "./faceWarningMessage";
import TestIDMissing from "./testIDMissing.js";
import SubmittedMessage from "./submittedMessage.js";
import FaceTracking from "./faceDetection.js";
import "../App.css";
import TestComponent from "./testComponent.js";
import { GlobalProvider, useGlobalContext } from "../globalContext";
import TestSetupWizard from "./TestSetupWizard.js";
import useAudioDetection from "./useAudioDetection.js";

// Toast Component for notifications
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
          <svg className="toast-icon" viewBox="0 0 24 24">
            {toast.type === 'error' && <path fill="#e53e3e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>}
            {toast.type === 'success' && <path fill="#38a169" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
            {toast.type === 'warning' && <path fill="#dd6b20" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
            {toast.type === 'info' && <path fill="#3182ce" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

//Proctor
//1. Content Menu Disable
//2. Select Text Disable
//3. Disable Cut, Copy and Paste
//4. Auto fullscreen mode
//5. Request for Camera and Mic
//5. Check fullscreen Exit
//6. Check move to another screen
//7. Reorder the questions

//ToDo
//8. Deduct no of display and check whether they are Duplicate

//User Attention
//Multiple Persons
//Candidate Verification
//Mobile Phone Detection
//Detect Multiple Speakers
//Detect Participant Switching
//Voice Recognition
//Secure Exam Environment

const questionSet = [];

// Handler for entering full screen
const handleFullScreen = () => {
  const element = document.documentElement;
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
};

const handlePreventDefault = (event) => {
  event.preventDefault();
  alert("Action disabled!");
};

const TestPage = () => {
  const [userUniqueID, setUserUniqueID] = useState('');
  const [userUniqueIDPresent, setUserUniqueIDPresent] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false); // New state
/*   const [confidence, setConfidence] = useState(0);
 */
  const [isTerminated, setIsTerminated] = useState(false); // New state
  const [terminationReason, setTerminationReason] = useState(''); // Reason for termination
  const [toasts, setToasts] = useState([]); // Toast notifications
  const clipboardHashRef = useRef(null); // Track clipboard content hash

  const [faceRecognition, setFaceRecognition] = useState(false);
  const [toleranceLevel, setToleranceLevel] = useState(0);
  const [allowedDefaults, setAllowedDefaults] = useState(10); // Default to 10 allowed deviations

  // Status check states
  const [statusChecked, setStatusChecked] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [canStartTest, setCanStartTest] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Toast functions
  const showToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };
  
  useEffect(() => {
    // Fetch initial config on component mount, passing templateID as a query param
    fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userUniqueID }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.statusCode === 200 && data.body) {
          // Parse the JSON string in body
          const body = JSON.parse(data.body);
          const config = Array.isArray(body.configurations) && body.configurations.length > 0
            ? body.configurations[0]
            : {};
          setFaceRecognition(config.faceRecognition === "True");
          setToleranceLevel(Number(config.toleranceLevel) || 0);
          setAllowedDefaults(Number(config.allowedDefaults) || 10); // Default to 10 if not set
        } else {
          console.error("Error fetching configuration:", data);
        }
      })
      .catch(error => {
        console.error("Error fetching configuration:", error);
      });
  }, [userUniqueID]);

  useEffect(() => {
    // Extract the value from the URL
    const url = window.location.href; // Get the full URL
    const parts = url.split('/'); // Split the URL by '/'
    const value = parts[parts.length - 1]; // Get the last part of the URL
    setUserUniqueID(value); // Set the value in state

    if (value != '')
    {
      setUserUniqueIDPresent(true);
    }
  }, []); // Run only once on component mount

  // Check test status upfront when testID is available
  useEffect(() => {
    if (!userUniqueID || statusChecked) return;

    const checkTestStatus = async () => {
      try {
        const response = await fetch(
          "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkTestStatus",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ testID: userUniqueID }),
          }
        );

        const data = await response.json();
        
        if (data.statusCode === 200 && data.body) {
          const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          setTestStatus(body.status);
          setStatusMessage(body.message);
          setCanStartTest(body.canStart);
        } else if (data.body) {
          const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          setTestStatus(body.status || 'Error');
          setStatusMessage(body.error || body.message || 'Unable to verify test status');
          setCanStartTest(false);
        }
        setStatusChecked(true);
      } catch (error) {
        console.error("Error checking test status:", error);
        setStatusMessage('Unable to verify test status. Please try again.');
        setCanStartTest(false);
        setStatusChecked(true);
      }
    };

    checkTestStatus();
  }, [userUniqueID, statusChecked]);

  // Countdown and redirect for invalid test status
  useEffect(() => {
    if (!statusChecked || canStartTest) return;

    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          window.location.href = 'https://www.hrrobots.com';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [statusChecked, canStartTest]);
  
  // const [userDetails, setUserDetails] = useState({ name: "", email: "", phone: "" });
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [isFocused, setIsFocused] = useState(true);
  const [faceOffFocusCount, setFaceOffFocusCount] = useState(0);
  const [faceOffWarningCount, setFaceOffWarningCount] = useState(0);
  const [faceFocusScore, setFaceFocusScore] = useState(-1); // -1 means not initialized yet
  const [continuousLowScoreStart, setContinuousLowScoreStart] = useState(null);
  const [showFaceWarning, setShowFaceWarning] = useState(false);
  const [faceDetectionInitialized, setFaceDetectionInitialized] = useState(false);
  const [multipleFacesWarningCount, setMultipleFacesWarningCount] = useState(0);
  const [showMultipleFacesWarning, setShowMultipleFacesWarning] = useState(false);
  const faceFocusScoreRef = useRef(-1); // Ref to track latest score for interval
  const lowScoreStartRef = useRef(null); // Ref to track when low score started
  const warningShownForCurrentPeriodRef = useRef(false); // Track if warning was shown for current no-face period
  const [cameraPermission, setCameraPermission] = useState(null);
  const [micPermission, setMicPermission] = useState(null);
  const [clipboardPermission, setClipboardPermission] = useState(null);
  const [saveAnswers, setSaveAnswers] = useState([]);
  const { globalValue, setGlobalValue } = useGlobalContext("");
  const [ candidateName, setCandidateName ] = useState("");
  const { candidateAccept, setcandidateAccept } = useGlobalContext("");
  const [ isTimeOut, setIsTimeOut ] = useState(true);
  const [testProgress, setTestProgress] = useState({ currentQuestion: 0, questionCount: 0, answers: [], totalQuestions: 50, questionsLoaded: 0 });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isFaceDetectionLoaded, setIsFaceDetectionLoaded] = useState(false);
  const navigateToQuestionRef = useRef(null);
  const lastClipboardCheckRef = useRef(null); // Track last clipboard state

  // Audio detection state
  const [isTalking, setIsTalking] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [speechCount, setSpeechCount] = useState(0);

  // Audio detection hook - only active when quiz is started and not terminated
  const audioDetection = useAudioDetection({
    enabled: isQuizStarted && !isTerminated && micPermission,
    threshold: 30, // Adjust sensitivity (lower = more sensitive)
    silenceDelay: 500,
    onSpeechStart: () => {
      setIsTalking(true);
      setSpeechCount(prev => prev + 1);
      // Optional: Log or track speech events
      // console.log('Speech detected');
    },
    onSpeechEnd: () => {
      setIsTalking(false);
      // console.log('Speech ended');
    },
    onVolumeChange: (vol) => {
      setAudioVolume(vol);
    }
  });

  // Clipboard monitoring for screenshot detection
  useEffect(() => {
    if (!isQuizStarted || isTerminated) return;

    let hasTerminated = false; // Local guard to prevent multiple terminations

    const terminateForScreenshot = async (reason) => {
      if (hasTerminated) return; // Prevent multiple calls
      hasTerminated = true;
      
      // Call the API to update status in DB with termination reason
      try {
        await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/changeTestStatus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            testID: userUniqueID,
            terminationReason: 'screenshot',
          }),
        });
        
        // Calculate and save the score for attempted questions
        try {
          await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ testID: userUniqueID }),
          });
        } catch (scoreError) {
          // Silent fail for score calculation
        }
      } catch (error) {
        // Silent fail - termination will still happen locally
      }
      
      setTerminationReason('screenshot');
      showToast('error', 'Test Terminated', 'Taking screenshots during the test is not allowed.');
      setIsTerminated(true);
    };

    const checkClipboard = async () => {
      if (hasTerminated) return; // Skip if already terminated
      try {
        // Check if clipboard API is available
        if (!navigator.clipboard || !navigator.clipboard.read) return;

        const clipboardItems = await navigator.clipboard.read();
        
        for (const item of clipboardItems) {
          // Check if clipboard contains an image (screenshot)
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            // Create hash based on size only (type is usually same for screenshots)
            const newHash = `${blob.size}`;
            
            // If clipboard hash was set and this is a different image size, it's a new screenshot
            if (clipboardHashRef.current !== null && clipboardHashRef.current !== newHash) {
              terminateForScreenshot('Screenshot detected');
              return;
            }
            
            // Store the current hash
            clipboardHashRef.current = newHash;
          }
        }
      } catch (error) {
        // Clipboard access denied - try alternative method
        // Some browsers don't allow clipboard.read() without user gesture
      }
    };

    // Check clipboard more frequently (every 500ms)
    const clipboardInterval = setInterval(checkClipboard, 500);

    // Listen for keyboard shortcuts commonly used for screenshots
    const handleKeyDown = (e) => {
      // Detect Print Screen key (with or without modifiers)
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        terminateForScreenshot('Screenshot attempt detected (Print Screen)');
        return;
      }
      
      // Detect Windows + Print Screen (metaKey is Windows key on Windows)
      if (e.code === 'PrintScreen' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        terminateForScreenshot('Screenshot attempt detected (Win + Print Screen)');
        return;
      }
      
      // Detect Windows + Shift + S (Windows Snipping Tool)
      if ((e.key === 's' || e.key === 'S') && e.shiftKey && (e.metaKey || (e.getModifierState && e.getModifierState('OS')))) {
        e.preventDefault();
        terminateForScreenshot('Screenshot attempt detected (Snipping Tool)');
        return;
      }
      
      // Detect Cmd + Shift + 3/4/5 (Mac screenshots)
      if ((e.key === '3' || e.key === '4' || e.key === '5') && e.shiftKey && e.metaKey) {
        e.preventDefault();
        terminateForScreenshot('Screenshot attempt detected (Mac Screenshot)');
        return;
      }
    };

    // Also listen for keyup as some screenshot keys are only detectable on release
    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        terminateForScreenshot('Screenshot attempt detected (Print Screen)');
      }
    };

    // Listen for visibility change - if user switches away, they might be taking screenshot
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away - check clipboard when they return
        lastClipboardCheckRef.current = Date.now();
      } else if (lastClipboardCheckRef.current) {
        // User returned - immediately check clipboard for new screenshots
        setTimeout(checkClipboard, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial clipboard check to establish baseline
    checkClipboard();

    return () => {
      clearInterval(clipboardInterval);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isQuizStarted, isTerminated]);
  
  const handlePhotoCaptured = (status) => {
    setPhotoCaptured(status); // Update state when child notifies
  };

  const handleQuestionDotClick = (questionNum) => {
    // Only allow navigation to questions that have been loaded
    const targetIndex = questionNum - testProgress.questionCount;
    const questionsLoaded = testProgress.questionsLoaded || 0;
    if (targetIndex >= 0 && targetIndex < questionsLoaded && navigateToQuestionRef.current) {
      navigateToQuestionRef.current(questionNum);
    }
  };

  // Detect full-screen changes
  const onFullScreenChange = () => {
    const isFull = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    setIsFullScreen(!!isFull); // True if in full screen, false otherwise
  };

  const updateTestScore = async (userUniqueID, faceOffWarningCount) => {
    try {
        const response = await fetch("/api/update-test-score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userUniqueID,
                faceOffWarningCount,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data; // Returning response data for further use
    } catch (error) {
        console.error("Failed to update test score:", error);
        return null;
    }
};

useEffect(() => {
  const callAPI = async (reason) => {
    try {
      // First, change the test status to Terminated
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/changeTestStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testID: userUniqueID,
          terminationReason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      //console.log("API called successfully", userUniqueID);
      const data = await response.json();
      //console.log("API Response:", data);
      
      // Then, calculate and save the score for attempted questions
      try {
        await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ testID: userUniqueID }),
        });
      } catch (scoreError) {
        // Silent fail for score calculation - status change is more important
        //console.error("Failed to calculate score:", scoreError);
      }
    } catch (error) {
      //console.error("Failed to call API:", error);
    }
  };
if (userUniqueIDPresent && isQuizStarted && !isTerminated) {
  // console.log('Termination check:', {
  //   isTimeOut,
  //   isFullScreen,
  //   isFocused,
  //   cameraPermission,
  //   micPermission,
  //   faceOffWarningCount,
  //   allowedDefaults
  // });
  
  let terminationMessage = null;
  let reason = null;
  
  if (!isTimeOut) {
    terminationMessage = 'Time limit exceeded.';
    reason = 'timeout';
  } else if (!isFullScreen) {
    terminationMessage = 'Fullscreen mode was exited.';
    reason = 'fullscreen';
  } else if (!isFocused) {
    terminationMessage = 'Window focus was lost.';
    reason = 'window';
  } else if (!cameraPermission) {
    terminationMessage = 'Camera access was denied.';
    reason = 'camera';
  } else if (!micPermission) {
    terminationMessage = 'Microphone access was denied.';
    reason = 'mic';
  } else if (allowedDefaults > 0 && faceOffWarningCount >= allowedDefaults) {
    terminationMessage = 'Too many face detection warnings.';
    reason = 'face';
  } else if (allowedDefaults > 0 && multipleFacesWarningCount >= allowedDefaults) {
    terminationMessage = 'Too many multiple faces detected warnings.';
    reason = 'multiplefaces';
  }
  
  if (terminationMessage) {
    // Call the API if any of the conditions are not met
    //console.log("API call triggered - Test Terminated!");
    callAPI(reason);
    showToast('error', 'Test Terminated', terminationMessage);
    setTerminationReason(reason);
    setIsTerminated(true); // Set the termination state to true 
  }}
}, [
  isTimeOut,
  isFullScreen,
  isFocused,
  cameraPermission,
  micPermission,
  faceOffWarningCount,
  multipleFacesWarningCount,
  allowedDefaults,
]);

  useEffect(() => {
    // Keep ref in sync with state
    faceFocusScoreRef.current = faceFocusScore;
    
    // Mark face detection as initialized once we get a valid score (>= 0)
    if (faceFocusScore >= 0 && !faceDetectionInitialized) {
      setFaceDetectionInitialized(true);
    }
  }, [faceFocusScore, faceDetectionInitialized]);

  useEffect(() => {
    // Only start checking after face detection is initialized
    if (!faceDetectionInitialized) return;

    // Use an interval to check face score periodically
    const checkInterval = setInterval(() => {
      const currentScore = faceFocusScoreRef.current;
      
      // Check if face score is 0 (no face detected)
      if (currentScore === 0) {
        // No face detected
        if (lowScoreStartRef.current === null) {
          // Start tracking
          //console.log('No face detected, starting timer');
          lowScoreStartRef.current = Date.now();
          warningShownForCurrentPeriodRef.current = false;
        } else if (!warningShownForCurrentPeriodRef.current) {
          // Check if 5 seconds have passed
          const elapsedTime = Date.now() - lowScoreStartRef.current;
          //console.log('Elapsed time with no face:', elapsedTime, 'ms');
          if (elapsedTime >= 5000) {
            //console.log('5 seconds passed! Showing warning');
            setShowFaceWarning(true);
            setFaceOffWarningCount(c => c + 1);
            setFaceOffFocusCount(c => c + 1);
            warningShownForCurrentPeriodRef.current = true; // Mark that we've shown warning for this period
          }
        }
      } else {
        // Face is detected (score > 0)
        if (lowScoreStartRef.current !== null || warningShownForCurrentPeriodRef.current) {
          //console.log('Face detected, hiding warning');
          lowScoreStartRef.current = null;
          warningShownForCurrentPeriodRef.current = false;
          setShowFaceWarning(false);
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(checkInterval);
  }, [faceDetectionInitialized]);

  const handleFaceScore = (data) =>{
    setFaceFocusScore(data);
    };

  // Detect window focus and blur
  useEffect(() => {
    const handleBlur = () => setIsFocused(false);
    //const handleFocus = () => setIsFocused(true);

    window.addEventListener("blur", handleBlur);
    //window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      //window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Fullscreen change event listeners
  useEffect(() => {
    document.addEventListener("fullscreenchange", onFullScreenChange);
    document.addEventListener("webkitfullscreenchange", onFullScreenChange);
    document.addEventListener("msfullscreenchange", onFullScreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullScreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullScreenChange);
      document.removeEventListener("msfullscreenchange", onFullScreenChange);
    };
  }, []);

  useEffect(() => {
    const disableContextMenu = (e) => e.preventDefault()
    document.addEventListener('contextmenu', disableContextMenu)

    //const shuffledQuestions = [...questionSet];
    //shuffleArray(shuffledQuestions);
    //setQuestions(shuffledQuestions.slice(0, 50));
    //setAnswers(Array(50).fill(null));
  }, []);

  //const sanitizeName = (name) => {
  //  // Remove special characters, spaces, and add a timestamp
  //  const sanitized = name.replace(/[^a-zA-Z0-9]/g, "_");
  //  const timestamp = Date.now();
  //  return `${sanitized}_${timestamp}`;
  //};

  //const shuffleArray = (array) => {
  //  for (let i = array.length - 1; i > 0; i--) {
  //    const j = Math.floor(Math.random() * (i + 1));
  //    [array[i], array[j]] = [array[j], array[i]];
  //  }
  //};

  /*const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails({ ...userDetails, [name]: value });
  };*/
 
  // Request camera, microphone, and clipboard permissions
const requestCameraAndMic = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    // console.log(stream);
    setCameraPermission(true);
    setMicPermission(true);
    //console.log("Camera and Microphone access granted");
    //stream.getTracks().forEach((track) => track.stop()); 
    // Stop tracks after checking
    
    // Request clipboard permission upfront using Permissions API
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'clipboard-read' });
        if (result.state === 'granted') {
          setClipboardPermission(true);
        } else if (result.state === 'prompt') {
          // Try to trigger the permission prompt
          try {
            await navigator.clipboard.read();
            setClipboardPermission(true);
          } catch (e) {
            // Check permission state again after prompt
            const newResult = await navigator.permissions.query({ name: 'clipboard-read' });
            setClipboardPermission(newResult.state === 'granted');
          }
        } else {
          setClipboardPermission(false);
        }
        // Listen for permission changes
        result.onchange = () => {
          setClipboardPermission(result.state === 'granted');
        };
      } else if (navigator.clipboard && navigator.clipboard.read) {
        // Fallback for browsers without Permissions API
        await navigator.clipboard.read();
        setClipboardPermission(true);
      }
    } catch (clipboardError) {
      // Clipboard permission denied or not supported
      setClipboardPermission(false);
      console.log("Clipboard permission not granted");
    }
  } catch (error) {
    setCameraPermission(false);
    setMicPermission(false);
    //console.error("Camera and Microphone access denied", error);
  }
};

const startQuiz = () => {
  
  if (cameraPermission && micPermission)
    {
    /*if (userDetails.name && userDetails.email && userDetails.phone) {*/
      handleFullScreen();
      setIsFocused(false);
      setIsFocused(true);
      setIsQuizStarted(true);
    /*} 
    else 
    {
      alert("Please fill in all the details to start the quiz.");
    }*/
  }
};

// const saveAnswer = (answer) => {
//   const newAnswers = [...answers];
//   newAnswers[currentQuestionIndex] = answer;
//   setAnswers(newAnswers);
// };

const handleSaveAnswer = (question, answer, isCorrect) => {
  setSaveAnswers((prevAnswers) => [
    ...prevAnswers,
    { question: question, answer: answer, correctness: isCorrect },
  ]);
};

//const saveAnswer = (answer) => {
//  const currentQuestion = questions[currentQuestionIndex];
//  let isCorrect = null;
//  const question = questions[currentQuestionIndex].question;

//  if (currentQuestion.type === "mcq") {
//    isCorrect = answer === currentQuestion.answer ? "Correct" : "Incorrect";
//    //alert(questions[currentQuestionIndex].question);
//    //alert(isCorrect === "Correct" ? "Correct Answer!" : "Incorrect Answer!");
//  }

  //const newAnswers = [...answers];
  //handleSaveAnswer(question, answer, isCorrect);
  //newAnswers[currentQuestionIndex] = answer;
  //setAnswers(newAnswers);
//};


/* const handlePrev = () => {
  if (currentQuestionIndex > 0) {
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  }
};

const handleNext = () => {
  if (currentQuestionIndex < questions.length - 1) {
    setCurrentQuestionIndex(currentQuestionIndex + 1);
  } else {
    setIsSubmitted(true);
    //console.log("saveAnswers:", saveAnswers);
    saveToFile();		   
    //alert("Your answers have been submitted! Thank you.");
    //console.log("User Details:", userDetails);
    
  }
}; */

/* const saveToFile = async () => {
    // Calculate the report details
    const totalQuestions = questions.length;
    const attemptedQuestions = saveAnswers.length;
    const correctAnswers = saveAnswers.filter((q) => q.correctness === "Correct").length;
  
    // Create the report object
    const report = {
      totalQuestions: totalQuestions,
      attemptedQuestions: attemptedQuestions,
      correctAnswers: correctAnswers,
    };
  
    // Create formatted answers with correctness
                                
    const formattedAnswers = saveAnswers.map((q) => ({
      question: q.question,
      userAnswer: q.answer,
      correctness: q.correctness,
    }));
  
    const JSONData = JSON.stringify({
      userID: userUniqueID,
      report: report,
    });
  
    //console.log("Report: ", JSON.stringify(report));
    //console.log("formattedAnswers: ", JSONData);
  
    try {
      const response = await fetch(
        "https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/api/saveAnswers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json"},
          body: JSONData,
        }
      );
  
      if (response.ok) {
        const data = await response.json();
                              
        //console.log("File saved at:", data.filePath);
      } else {
        //console.error("Failed to save answers");
        alert("There was an issue saving your answers.");
      }
    } catch (error) {
      //console.error("Error:", error);
      alert("Error saving your answers. Please try again.");
    }
  }; */

if (userUniqueID != '')
{
    // Show status message if test cannot be started
    if (statusChecked && !canStartTest) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: 'Roboto, Arial, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '50px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: testStatus === 'Completed' ? '#28a745' : '#dc3545',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 25px'
            }}>
              {testStatus === 'Completed' ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              )}
            </div>
            <h1 style={{
              fontSize: '28px',
              color: '#333',
              marginBottom: '15px',
              fontWeight: '600'
            }}>
              Test {testStatus}
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '30px',
              lineHeight: '1.6'
            }}>
              {statusMessage}
            </p>
            <div style={{
              background: '#f8f9fa',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#888',
                margin: '0 0 10px 0'
              }}>
                Redirecting to HRRobots in
              </p>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#667eea'
              }}>
                {redirectCountdown}
              </div>
              <p style={{
                fontSize: '12px',
                color: '#aaa',
                margin: '10px 0 0 0'
              }}>
                seconds
              </p>
            </div>
            <a 
              href="https://www.hrrobots.com"
              style={{
                display: 'inline-block',
                padding: '12px 30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '25px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              Go to HRRobots Now
            </a>
          </div>
        </div>
      );
    }

    // Show loading while checking status
    if (!statusChecked) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: 'Roboto, Arial, sans-serif'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '20px', fontSize: '18px', color: 'white' }}>
            Verifying test status...
          </p>
        </div>
      );
    }

    if (!isQuizStarted) 
      {
      requestCameraAndMic();
      return (
        <TestSetupWizard
          userUniqueID={userUniqueID}
          cameraPermission={cameraPermission}
          micPermission={micPermission}
          clipboardPermission={clipboardPermission}
          onComplete={(status) => {
            handlePhotoCaptured(status);
            startQuiz();
          }}
          onCandidateNameChange={setCandidateName}
        />
      );
    }
  }
  else
  {
    <div><TestIDMissing /></div>
  }
  
  //const currentQuestion = questions[currentQuestionIndex];

  return (
    <div style={{ background:"white", overflow: "hidden", minHeight: "100vh", fontFamily: "Roboto, Arial, sans-serif", padding: "0px" }}>
      <Toast toasts={toasts} removeToast={removeToast} />
      { userUniqueIDPresent?
      <>
      <div
        style={{
          background: "linear-gradient(132deg, rgb(227, 244, 253) 0.00%, rgb(170, 209, 226) 100.00%)",
          marginTop: "50px",
          padding: "0 5px 0",
          color: "black",
          display: "flex",
          alignItems: "center",
          lineHeight: "0"
        }}
      >
        <p>
        &ensp;
        <span
          style={{
            height: "35px",
            fontSize:"12px",
            width: "35px",
            borderRadius: "50%",
            display: "flex",
            backgroundColor: isFullScreen ? "green" : "red",
            color:"white",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            title: "Full screen mode, the candidate will be disqualified if the Full Screen model is exited."
          }}
        >FSM</span>
        </p>&ensp;<p>
        &ensp;<span
          style={{
            height: "35px",
            fontSize:"12px",
            width: "35px",
            borderRadius: "50%",
            display: "flex",
            backgroundColor: isFocused ? "green" : "red",
            color:"white",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >WIN</span>
        </p>&ensp;<p>
        &ensp;<span
          style={{
            height: "35px",
            fontSize:"12px",
            width: "35px",
            borderRadius: "50%",
            display: "flex",
            backgroundColor: cameraPermission ? "green" : "red",
            color:"white",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >CAM</span>
        </p>&ensp;
        <p>
        &ensp;<span
          style={{
            height: "35px",
            fontSize:"12px",
            width: "35px",
            borderRadius: "50%",
            display: "flex",
            backgroundColor: micPermission ? "green" : "red",
            color:"white",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >MIC</span>
        </p>&ensp;
        {/* <p style={{ fontSize: '12px', color: 'black' }}>
          Score: {faceFocusScore >= 0 ? faceFocusScore.toFixed(2) : 'Loading...'} | Init: {faceDetectionInitialized ? 'YES' : 'NO'} | Warning: {showFaceWarning ? 'YES' : 'NO'}
        </p> */}
        {isTimeOut && isFullScreen && isFocused && cameraPermission && micPermission && !isTerminated && (!faceRecognition || (faceOffWarningCount < allowedDefaults && multipleFacesWarningCount < allowedDefaults))? 
        // {isTimeOut? 
          <>
          <FaceTracking 
        userUniqueID={userUniqueID} 
        handleFaceScore={(d) => setFaceFocusScore(d)}
        toleranceLevel={toleranceLevel}
        onTimerEnd={(d) => {
          //console.log("Timer has ended! test page component will be closed.");
          setIsTimeOut(false); // Trigger termination
          }}
        onLoadComplete={(loaded) => setIsFaceDetectionLoaded(loaded)}
        onMultipleFacesDetected={(faceCount) => {
          setMultipleFacesWarningCount(c => c + 1);
          setShowMultipleFacesWarning(true);
          // Auto-hide warning after 3 seconds
          setTimeout(() => setShowMultipleFacesWarning(false), 3000);
        }}
        audioVolume={audioDetection.volume}
        isTalking={audioDetection.isTalking}
        speechCount={speechCount}
        isAudioListening={audioDetection.isListening}
        isFirstQuestionLoaded={testProgress.questionsLoaded > 0}
        />
        {/* Progress dots for larger screens */}
        <div className="progress-dots-desktop" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          flex: 1,
          justifyContent: 'center',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {Array.from({ length: 50 }, (_, i) => {
            const questionNum = i + 1;
            const currentDisplayQuestion = testProgress.questionCount <= 1 
              ? testProgress.currentQuestion + 1 
              : testProgress.currentQuestion + testProgress.questionCount;
            const isAnswered = testProgress.answers[i - testProgress.questionCount + 1] && testProgress.answers[i - testProgress.questionCount + 1] !== "";
            const isCurrent = questionNum === currentDisplayQuestion;
            const targetIndex = questionNum - testProgress.questionCount;
            const questionsLoaded = testProgress.questionsLoaded || 0;
            const isClickable = targetIndex >= 0 && targetIndex < questionsLoaded;
            return (
              <span
                key={i}
                onClick={() => isClickable && handleQuestionDotClick(questionNum)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: isAnswered ? '#28a745' : '#fd7e14',
                  border: isCurrent ? '2px solid #007bff' : 'none',
                  boxSizing: 'border-box',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  opacity: isClickable ? 1 : 0.5
                }}
                title={isClickable ? `Go to Question ${questionNum}` : `Question ${questionNum} (not loaded yet)`}
              >
                {questionNum}
              </span>
            );
          })}
        </div>
        {/* Hamburger for mobile */}
        <button 
          className="progress-hamburger"
          onClick={() => setShowProgressModal(true)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            marginLeft: 'auto',
            padding: '5px 10px'
          }}
        >
          ☰
        </button>
        </>
        :
        <div style={{
          fontSize: '75px', // Much bigger font size
          fontFamily: 'fantasy', // Calculator-like font
          textAlign: 'center', // Center the text
          width: '100%',
          color: 'red'
       }}>
        {!isTimeOut ? 'Time Out' : 'Terminated'} 
        </div>
        }
      </div>
      </>
      :
      <></>
      }
    { userUniqueIDPresent ?
    <>
    {/*     {faceOffWarningCount < 10? */} 
    {isTimeOut && isFullScreen && isFocused && cameraPermission && micPermission && !isTerminated && (!faceRecognition || (faceOffWarningCount < allowedDefaults && multipleFacesWarningCount < allowedDefaults))? 
    <>
        {showFaceWarning && 
        <FaceWarningMessage userUniqueID={userUniqueID} count={faceOffWarningCount} offFocus={faceOffFocusCount}/>
        }
        {showMultipleFacesWarning && 
        <FaceWarningMessage userUniqueID={userUniqueID} count={multipleFacesWarningCount} offFocus={0} warningType="multiplefaces"/>
        }
        {isFaceDetectionLoaded ? (
          <TestComponent testID={userUniqueID} userID={globalValue} candidateName={candidateName} onProgressUpdate={setTestProgress} navigateToQuestionRef={navigateToQuestionRef}/>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px',
            padding: '40px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '20px', fontSize: '18px', color: '#666' }}>
              Loading Face Detection...
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Please ensure your face is visible in the camera
            </p>
          </div>
        )}
      </>
      :
      <div>
        <WarningMessage reason={terminationReason} />
      </div>
      }

      </>
      :
      <div><TestIDMissing/></div>
    }
    {/* Progress Modal for mobile */}
    {showProgressModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9998
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '10px',
          maxWidth: '95%',
          maxHeight: '80%',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Question Progress</h3>
            <button 
              onClick={() => setShowProgressModal(false)}
              style={{
                background: '#f0f0f0',
                border: '1px solid #ccc',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                color: '#333',
                width: '30px',
                height: '30px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                lineHeight: '1'
              }}
            >×</button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '5px'
          }}>
            {Array.from({ length: 50 }, (_, i) => {
              const questionNum = i + 1;
              const currentDisplayQuestion = testProgress.questionCount <= 1 
                ? testProgress.currentQuestion + 1 
                : testProgress.currentQuestion + testProgress.questionCount;
              const isAnswered = testProgress.answers[i - testProgress.questionCount + 1] && testProgress.answers[i - testProgress.questionCount + 1] !== "";
              const isCurrent = questionNum === currentDisplayQuestion;
              const targetIndex = questionNum - testProgress.questionCount;
              const questionsLoaded = testProgress.questionsLoaded || 0;
              const isClickable = targetIndex >= 0 && targetIndex < questionsLoaded;
              return (
                <span
                  key={i}
                  onClick={() => {
                    if (isClickable) {
                      handleQuestionDotClick(questionNum);
                      setShowProgressModal(false);
                    }
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isAnswered ? '#28a745' : '#fd7e14',
                    border: isCurrent ? '2px solid #007bff' : 'none',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: 'white',
                    cursor: isClickable ? 'pointer' : 'not-allowed',
                    opacity: isClickable ? 1 : 0.5
                  }}
                  title={isClickable ? `Go to Question ${questionNum}` : `Question ${questionNum} (not loaded yet)`}
                >
                  {questionNum}
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '15px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#28a745', marginRight: '5px' }}></span>
              Answered
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#fd7e14', marginRight: '5px' }}></span>
              Not Answered
            </span>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default TestPage;
