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
import ProctorWarningModal from "./ProctorWarningModal.js";
import FaceDetectionPreloader from "./FaceDetectionPreloader.js";

// Toast Component for notifications
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
          role="alert"
          aria-atomic="true"
        >
          <svg className="toast-icon" viewBox="0 0 24 24" aria-hidden="true">
            {toast.type === 'error' && <path fill="#e53e3e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>}
            {toast.type === 'success' && <path fill="#38a169" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
            {toast.type === 'warning' && <path fill="#dd6b20" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
            {toast.type === 'info' && <path fill="#3182ce" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button 
            className="toast-close" 
            onClick={() => removeToast(toast.id)}
            aria-label={`Dismiss ${toast.type} notification: ${toast.title}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
  const [isSubmitted, setIsSubmitted] = useState(false); // Track if test is submitted
  const [terminationReason, setTerminationReason] = useState(''); // Reason for termination
  const [toasts, setToasts] = useState([]); // Toast notifications
  const clipboardHashRef = useRef(null); // Track clipboard content hash

  const [faceRecognition, setFaceRecognition] = useState(false);
  const [toleranceLevel, setToleranceLevel] = useState(0);
  const [allowedDefaults, setAllowedDefaults] = useState(10); // Default to 10 allowed deviations
  const [numberOfQuestions, setNumberOfQuestions] = useState(10); // Default to 10 questions
  const [testDuration, setTestDuration] = useState(60); // Default to 60 minutes
  const [sensitivityLevel, setSensitivityLevel] = useState(5); // Default to 5 seconds
  const [templateID, setTemplateID] = useState(''); // Template ID for configuration lookup
  const [configLoaded, setConfigLoaded] = useState(false); // Track if configuration has been loaded

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
  
  // Fetch configuration when templateID is available
  useEffect(() => {
    //console.log("Config useEffect triggered, templateID:", templateID); // Debug log
    if (!templateID) {
      // Don't set configLoaded to true if templateID is not available yet
      //console.log("templateID is empty, skipping config fetch"); // Debug log
      return;
    }
    
    //console.log("Fetching config for templateID:", templateID); // Debug log
    fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateID }),
    })
      .then(res => res.json())
      .then(data => {
        //console.log("Config API response:", data); // Debug log
        if (data.statusCode === 200 && data.body) {
          const body = JSON.parse(data.body);
          //console.log("Parsed config body:", body); // Debug log
          const config = Array.isArray(body.configurations) && body.configurations.length > 0
            ? body.configurations[0]
            : {};
          //console.log("Config object:", config); // Debug log
          //console.log("numberOfQuestions from config:", config.numberOfQuestions); // Debug log
          setFaceRecognition(config.faceRecognition === "True");
          setToleranceLevel(Number(config.toleranceLevel) || 0);
          setAllowedDefaults(Number(config.allowedDefaults) || 10);
          setNumberOfQuestions(Number(config.numberOfQuestions) || 10);
          setTestDuration(Number(config.testDuration) || 60);
          setSensitivityLevel(Number(config.sensitivityLevel) || 5);
        }
        setConfigLoaded(true);
      })
      .catch(error => {
        //console.error("Error fetching configuration:", error);
        setConfigLoaded(true);
      });
  }, [templateID]);

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
        //console.log("checkTestStatus response:", data); // Debug log
        
        if (data.statusCode === 200 && data.body) {
          const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          //console.log("checkTestStatus body:", body); // Debug log
          //console.log("templateID from checkTestStatus:", body.templateID); // Debug log
          setTestStatus(body.status);
          setStatusMessage(body.message);
          setCanStartTest(body.canStart);
          // Set templateID for configuration lookup
          if (body.templateID) {
            //console.log("Setting templateID to:", body.templateID); // Debug log
            setTemplateID(body.templateID);
          } else {
            //console.log("No templateID in response!"); // Debug log
          }
        } else if (data.body) {
          const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          setTestStatus(body.status || 'Error');
          setStatusMessage(body.error || body.message || 'Unable to verify test status');
          setCanStartTest(false);
          // Set templateID even on error for potential config lookup
          if (body.templateID) {
            setTemplateID(body.templateID);
          }
        }
        setStatusChecked(true);
      } catch (error) {
        //console.error("Error checking test status:", error);
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
  const [singleScreenOnly, setSingleScreenOnly] = useState(null);
  const [saveAnswers, setSaveAnswers] = useState([]);
  const { globalValue, setGlobalValue } = useGlobalContext("");
  const [ candidateName, setCandidateName ] = useState("");
  const { candidateAccept, setcandidateAccept } = useGlobalContext("");
  const [ isTimeOut, setIsTimeOut ] = useState(true);
  const [testProgress, setTestProgress] = useState({ currentQuestion: 0, questionCount: 0, answers: [], totalQuestions: numberOfQuestions, questionsLoaded: 0 });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isFaceDetectionLoaded, setIsFaceDetectionLoaded] = useState(false);
  const navigateToQuestionRef = useRef(null);
  const lastClipboardCheckRef = useRef(null); // Track last clipboard state

  // Proctor warning modal states
  const [showProctorWarning, setShowProctorWarning] = useState(false);
  const [proctorWarningType, setProctorWarningType] = useState(null); // 'fullscreen' or 'focus'
  const [fullscreenAttempts, setFullscreenAttempts] = useState(0);
  const [focusAttempts, setFocusAttempts] = useState(0);
  const maxProctorAttempts = 3;
  
  // Refs to track current state for event listeners
  const isQuizStartedRef = useRef(false);
  const isTerminatedRef = useRef(false);
  const isSubmittedRef = useRef(false);
  const showProctorWarningRef = useRef(false);

  // Keep refs in sync with state for event listeners
  useEffect(() => {
    isQuizStartedRef.current = isQuizStarted;
  }, [isQuizStarted]);

  useEffect(() => {
    isTerminatedRef.current = isTerminated;
  }, [isTerminated]);

  useEffect(() => {
    isSubmittedRef.current = isSubmitted;
  }, [isSubmitted]);

  useEffect(() => {
    showProctorWarningRef.current = showProctorWarning;
  }, [showProctorWarning]);

  // Audio detection state
  const [isTalking, setIsTalking] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);
  const [speechCount, setSpeechCount] = useState(0);

  // Audio detection hook - only active when quiz is started and not terminated/submitted
  const audioDetection = useAudioDetection({
    enabled: isQuizStarted && !isTerminated && !isSubmitted && micPermission,
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
    if (!isQuizStarted || isTerminated || isSubmitted) return;

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
  }, [isQuizStarted, isTerminated, isSubmitted]);
  
  const handlePhotoCaptured = (status) => {
    setPhotoCaptured(status); // Update state when child notifies
  };

  const handleQuestionDotClick = (questionNum) => {
    // Only allow navigation to questions that have been loaded
    // questionCount is the number of previously answered questions
    // So question (questionCount + 1) is at index 0
    const targetIndex = questionNum - testProgress.questionCount - 1;
    const questionsLoaded = testProgress.questionsLoaded || 0;
    if (targetIndex >= 0 && targetIndex < questionsLoaded && navigateToQuestionRef.current) {
      navigateToQuestionRef.current(questionNum);
    }
  };

  // Detect full-screen changes
  const onFullScreenChange = () => {
    const isFull = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    
    if (!isFull && isQuizStartedRef.current && !isTerminatedRef.current && !isSubmittedRef.current) {
      // Fullscreen was exited during test - show warning modal
      setFullscreenAttempts(prev => prev + 1);
      setProctorWarningType('fullscreen');
      setShowProctorWarning(true);
    }
    
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
        //console.error("Failed to update test score:", error);
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
if (userUniqueIDPresent && isQuizStarted && !isTerminated && !isSubmitted) {
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
  } else if (!isFullScreen && fullscreenAttempts >= maxProctorAttempts) {
    terminationMessage = 'Fullscreen mode was exited too many times.';
    reason = 'fullscreen';
  } else if (!isFocused && focusAttempts >= maxProctorAttempts) {
    terminationMessage = 'Window focus was lost too many times.';
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
  fullscreenAttempts,
  focusAttempts,
  maxProctorAttempts,
  isSubmitted,
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
    // Only start checking after face detection is initialized and test is active
    if (!faceDetectionInitialized || isTerminated || isSubmitted) return;

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
          // Check if sensitivityLevel seconds have passed
          const elapsedTime = Date.now() - lowScoreStartRef.current;
          //console.log('Elapsed time with no face:', elapsedTime, 'ms');
          if (elapsedTime >= sensitivityLevel * 1000) {
            //console.log('sensitivityLevel seconds passed! Showing warning');
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
  }, [faceDetectionInitialized, sensitivityLevel, isTerminated, isSubmitted]);

  const handleFaceScore = (data) =>{
    setFaceFocusScore(data);
    };

  // Detect window focus and blur
  useEffect(() => {
    const handleBlur = () => {
      if (isQuizStartedRef.current && !isTerminatedRef.current && !showProctorWarningRef.current && !isSubmittedRef.current) {
        // Window lost focus during test - show warning modal
        setFocusAttempts(prev => prev + 1);
        setProctorWarningType('focus');
        setShowProctorWarning(true);
      }
      setIsFocused(false);
    };
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
    
    // Check for multiple screens
    try {
      if (window.screen && window.screen.isExtended !== undefined) {
        // Modern Screen API - isExtended is true if multiple screens
        setSingleScreenOnly(!window.screen.isExtended);
      } else if (window.getScreenDetails) {
        // Screen Enumeration API (requires permission)
        const screenDetails = await window.getScreenDetails();
        setSingleScreenOnly(screenDetails.screens.length === 1);
      } else {
        // Fallback - assume single screen if API not available
        setSingleScreenOnly(true);
      }
    } catch (screenError) {
      // If screen detection fails, assume single screen
      setSingleScreenOnly(true);
    }
    
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
      //console.log("Clipboard permission not granted");
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

// Handler for returning to test from proctor warning modal
const handleReturnToTest = () => {
  setShowProctorWarning(false);
  
  if (proctorWarningType === 'fullscreen') {
    // Re-enter fullscreen
    handleFullScreen();
  }
  
  // Restore focus
  setIsFocused(true);
  setIsFullScreen(true);
  setProctorWarningType(null);
};

// Handler when max proctor attempts are reached
const handleMaxProctorAttemptsReached = () => {
  setShowProctorWarning(false);
  // The termination will be handled by the useEffect that checks attempts
};

// Handler when timer expires without returning to test
const handleTimerExpired = () => {
  setShowProctorWarning(false);
  // Set max attempts to force termination
  if (proctorWarningType === 'fullscreen') {
    setFullscreenAttempts(maxProctorAttempts);
  } else {
    setFocusAttempts(maxProctorAttempts);
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
          singleScreenOnly={singleScreenOnly}
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
    <FaceDetectionPreloader>
      <div style={{ background:"white", overflow: "hidden", minHeight: "100vh", fontFamily: "Roboto, Arial, sans-serif", padding: "0px" }}>
        <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* Proctor Warning Modal for Fullscreen/Focus violations */}
      {showProctorWarning && (
        <ProctorWarningModal
          key={`${proctorWarningType}-${proctorWarningType === 'fullscreen' ? fullscreenAttempts : focusAttempts}`}
          isVisible={showProctorWarning}
          warningType={proctorWarningType}
          attemptCount={proctorWarningType === 'fullscreen' ? fullscreenAttempts : focusAttempts}
          maxAttempts={maxProctorAttempts}
          userUniqueID={userUniqueID}
          onReturnToTest={handleReturnToTest}
          onMaxAttemptsReached={handleMaxProctorAttemptsReached}
          onTimerExpired={handleTimerExpired}
        />
      )}
      
      { userUniqueIDPresent?
      <>
      <div className="test-nav-bar" role="toolbar" aria-label="Test status and navigation">
        <div className="status-indicators" role="group" aria-label="Proctoring status indicators">
          {/* Fullscreen Mode */}
          <span
            className={`status-badge ${isFullScreen ? 'active' : 'inactive'}`}
            title="Full screen mode - candidate will be disqualified if exited"
            role="status"
            aria-label={`Fullscreen mode: ${isFullScreen ? 'Active' : 'Inactive'}${fullscreenAttempts > 0 ? `, ${fullscreenAttempts} violations` : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            {fullscreenAttempts > 0 && <span className="status-counter" aria-hidden="true">{fullscreenAttempts}</span>}
          </span>
          {/* Window Focus */}
          <span
            className={`status-badge ${isFocused ? 'active' : 'inactive'}`}
            title="Window focus status"
            role="status"
            aria-label={`Window focus: ${isFocused ? 'Active' : 'Inactive'}${focusAttempts > 0 ? `, ${focusAttempts} violations` : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H5V8h14v10z"/>
            </svg>
            {focusAttempts > 0 && <span className="status-counter" aria-hidden="true">{focusAttempts}</span>}
          </span>
          {/* Camera */}
          <span
            className={`status-badge ${cameraPermission ? 'active' : 'inactive'}`}
            title="Camera permission status"
            role="status"
            aria-label={`Camera: ${cameraPermission ? 'Enabled' : 'Disabled'}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </span>
          {/* Microphone */}
          <span
            className={`status-badge ${micPermission ? 'active' : 'inactive'}`}
            title="Microphone permission status"
            role="status"
            aria-label={`Microphone: ${micPermission ? 'Enabled' : 'Disabled'}${speechCount > 0 ? `, speech detected ${speechCount} times` : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
            {speechCount > 0 && <span className="status-counter" aria-hidden="true">{speechCount}</span>}
          </span>
          {/* Screenshot Detection */}
          <span
            className={`status-badge ${clipboardPermission ? 'active' : 'inactive'}`}
            title="Screenshot detection - test will terminate if screenshot is taken"
            role="status"
            aria-label={`Screenshot detection: ${clipboardPermission ? 'Active' : 'Inactive'}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </span>
          {/* Audio/Speech Detection */}
          <span
            className={`status-badge ${audioDetection.isListening ? 'active' : 'inactive'} ${isTalking ? 'talking' : ''}`}
            title={`Audio detection - Speech detected: ${speechCount} times`}
            role="status"
            aria-label={`Audio detection: ${audioDetection.isListening ? 'Listening' : 'Inactive'}, speech detected ${speechCount} times`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            {speechCount > 0 && <span className="status-counter" aria-hidden="true">{speechCount}</span>}
          </span>
        </div>
        {isTimeOut && (isFullScreen || fullscreenAttempts < maxProctorAttempts) && (isFocused || focusAttempts < maxProctorAttempts) && cameraPermission && micPermission && !isTerminated && (!faceRecognition || (faceOffWarningCount < allowedDefaults && multipleFacesWarningCount < allowedDefaults))? 
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
        testDuration={testDuration}
        sensitivityLevel={sensitivityLevel}
        />
        {/* Progress dots for larger screens - auto-scaling based on question count */}
        {configLoaded ? (
        <nav className="progress-dots-desktop" role="navigation" aria-label="Question navigation" style={{
          // Auto-scale: fewer questions = larger dots, more questions = smaller dots
          '--dot-size': numberOfQuestions <= 20 ? '28px' : numberOfQuestions <= 35 ? '24px' : numberOfQuestions <= 50 ? '20px' : '16px',
          '--dot-font': numberOfQuestions <= 20 ? '12px' : numberOfQuestions <= 35 ? '10px' : numberOfQuestions <= 50 ? '9px' : '8px',
        }}>
          {Array.from({ length: numberOfQuestions }, (_, i) => {
            const questionNum = i + 1;
            const currentDisplayQuestion = testProgress.currentQuestion + testProgress.questionCount + 1;
            const answersIndex = i - testProgress.questionCount;
            const isAnswered = answersIndex >= 0 && testProgress.answers[answersIndex] && testProgress.answers[answersIndex] !== "";
            const isCurrent = questionNum === currentDisplayQuestion;
            const targetIndex = questionNum - testProgress.questionCount - 1;
            const questionsLoaded = testProgress.questionsLoaded || 0;
            const isClickable = targetIndex >= 0 && targetIndex < questionsLoaded;
            
            return (
              <button
                key={i}
                onClick={() => isClickable && handleQuestionDotClick(questionNum)}
                className={`question-dot ${isAnswered ? 'answered' : 'unanswered'} ${isCurrent ? 'current' : ''} ${!isClickable ? 'disabled' : ''}`}
                style={{
                  width: 'var(--dot-size)',
                  height: 'var(--dot-size)',
                  fontSize: 'var(--dot-font)',
                }}
                title={isClickable ? `Go to Question ${questionNum}` : `Question ${questionNum} (not loaded yet)`}
                aria-label={`Question ${questionNum}${isAnswered ? ', answered' : ', not answered'}${isCurrent ? ', current question' : ''}${!isClickable ? ', not available yet' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={!isClickable}
                tabIndex={isClickable ? 0 : -1}
              >
                {questionNum}
              </button>
            );
          })}
        </nav>
        ) : (
        <div className="progress-dots-desktop" style={{ justifyContent: 'center' }} role="status" aria-live="polite">
          <span style={{ fontSize: '12px', color: '#666' }}>Loading...</span>
        </div>
        )}
        {/* Three dots menu for mobile */}
        <button 
          className="progress-hamburger"
          onClick={() => setShowProgressModal(true)}
          aria-label="Open question progress menu"
          aria-haspopup="dialog"
        >
          ⋮
        </button>
        </>
        :
        <div style={{
          fontSize: '75px',
          fontFamily: 'fantasy',
          textAlign: 'center',
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
    {isTimeOut && (isFullScreen || fullscreenAttempts < maxProctorAttempts) && (isFocused || focusAttempts < maxProctorAttempts) && cameraPermission && micPermission && !isTerminated && (!faceRecognition || (faceOffWarningCount < allowedDefaults && multipleFacesWarningCount < allowedDefaults))? 
    <>
        {showFaceWarning && !showProctorWarning && 
        <FaceWarningMessage userUniqueID={userUniqueID} count={faceOffWarningCount} offFocus={faceOffFocusCount}/>
        }
        {showMultipleFacesWarning && !showProctorWarning && 
        <FaceWarningMessage userUniqueID={userUniqueID} count={multipleFacesWarningCount} offFocus={0} warningType="multiplefaces"/>
        }
        {isFaceDetectionLoaded && configLoaded ? (
          <TestComponent testID={userUniqueID} userID={globalValue} candidateName={candidateName} onProgressUpdate={setTestProgress} navigateToQuestionRef={navigateToQuestionRef} numberOfQuestions={numberOfQuestions} onSubmit={() => setIsSubmitted(true)}/>
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
      <div className="progress-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="progress-modal-title">
        <div className="progress-modal">
          <div className="progress-modal-header">
            <h3 id="progress-modal-title">Question Progress</h3>
            <button 
              className="progress-modal-close"
              onClick={() => setShowProgressModal(false)}
              aria-label="Close question progress modal"
            >×</button>
          </div>
          <nav 
            className="progress-modal-grid"
            role="navigation"
            aria-label="Question navigation grid"
            style={{
              // Auto-scale grid columns based on question count
              gridTemplateColumns: numberOfQuestions <= 20 
                ? 'repeat(5, 1fr)' 
                : numberOfQuestions <= 50 
                  ? 'repeat(10, 1fr)' 
                  : 'repeat(12, 1fr)',
              '--modal-dot-size': numberOfQuestions <= 20 ? '32px' : numberOfQuestions <= 50 ? '26px' : '22px',
              '--modal-dot-font': numberOfQuestions <= 20 ? '12px' : numberOfQuestions <= 50 ? '10px' : '9px',
            }}
          >
            {Array.from({ length: numberOfQuestions }, (_, i) => {
              const questionNum = i + 1;
              const currentDisplayQuestion = testProgress.currentQuestion + testProgress.questionCount + 1;
              const answersIndex = i - testProgress.questionCount;
              const isAnswered = answersIndex >= 0 && testProgress.answers[answersIndex] && testProgress.answers[answersIndex] !== "";
              const isCurrent = questionNum === currentDisplayQuestion;
              const targetIndex = questionNum - testProgress.questionCount - 1;
              const questionsLoaded = testProgress.questionsLoaded || 0;
              const isClickable = targetIndex >= 0 && targetIndex < questionsLoaded;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isClickable) {
                      handleQuestionDotClick(questionNum);
                      setShowProgressModal(false);
                    }
                  }}
                  className={`question-dot ${isAnswered ? 'answered' : 'unanswered'} ${isCurrent ? 'current' : ''} ${!isClickable ? 'disabled' : ''}`}
                  style={{
                    width: 'var(--modal-dot-size)',
                    height: 'var(--modal-dot-size)',
                    fontSize: 'var(--modal-dot-font)',
                    margin: '0 auto',
                  }}
                  title={isClickable ? `Go to Question ${questionNum}` : `Question ${questionNum} (not loaded yet)`}
                  aria-label={`Question ${questionNum}${isAnswered ? ', answered' : ', not answered'}${isCurrent ? ', current question' : ''}${!isClickable ? ', not available yet' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  disabled={!isClickable}
                >
                  {questionNum}
                </button>
              );
            })}
          </nav>
          <div className="progress-modal-legend" aria-hidden="true">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}></span>
              Answered
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: 'linear-gradient(135deg, #fd7e14 0%, #ffc107 100%)' }}></span>
              Not Answered
            </span>
          </div>
        </div>
      </div>
    )}
    </div>
    </FaceDetectionPreloader>
  );
};

export default TestPage;
