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

  const [faceRecognition, setFaceRecognition] = useState(false);
  const [toleranceLevel, setToleranceLevel] = useState(0);
  const [allowedDefaults, setAllowedDefaults] = useState(10); // Default to 10 allowed deviations
  
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
  const faceFocusScoreRef = useRef(-1); // Ref to track latest score for interval
  const lowScoreStartRef = useRef(null); // Ref to track when low score started
  const warningShownForCurrentPeriodRef = useRef(false); // Track if warning was shown for current no-face period
  const [cameraPermission, setCameraPermission] = useState(null);
  const [micPermission, setMicPermission] = useState(null);
  const [saveAnswers, setSaveAnswers] = useState([]);
  const { globalValue, setGlobalValue } = useGlobalContext("");
  const [ candidateName, setCandidateName ] = useState("");
  const { candidateAccept, setcandidateAccept } = useGlobalContext("");
  const [ isTimeOut, setIsTimeOut ] = useState(true);
  
  const handlePhotoCaptured = (status) => {
    setPhotoCaptured(status); // Update state when child notifies
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
  const callAPI = async () => {
    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/changeTestStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testID: userUniqueID,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      //console.log("API called successfully", userUniqueID);
      const data = await response.json();
      //console.log("API Response:", data);
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
  if (
    !isTimeOut ||
    !isFullScreen ||
    !isFocused ||
    !cameraPermission ||
    !micPermission ||
    (allowedDefaults > 0 && faceOffWarningCount >= allowedDefaults)
  ) {
    // Call the API if any of the conditions are not met
    //console.log("API call triggered - Test Terminated!");
    callAPI();
    setIsTerminated(true); // Set the termination state to true 
  }}
}, [
  isTimeOut,
  isFullScreen,
  isFocused,
  cameraPermission,
  micPermission,
  faceOffWarningCount,
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
 
  // Request camera and microphone permission
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
    if (!isQuizStarted) 
      {
      requestCameraAndMic();
      return (
        <TestSetupWizard
          userUniqueID={userUniqueID}
          cameraPermission={cameraPermission}
          micPermission={micPermission}
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
      { userUniqueIDPresent?
      <>
      <div
        style={{
          background: "linear-gradient(132deg, rgb(227, 244, 253) 0.00%, rgb(170, 209, 226) 100.00%)",
					marginTop: "80px",																		
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
        {isTimeOut && isFullScreen && isFocused && cameraPermission && micPermission && (!faceRecognition || faceOffWarningCount < allowedDefaults)? 
        // {isTimeOut? 
          <FaceTracking 
        userUniqueID={userUniqueID} 
        handleFaceScore={(d) => setFaceFocusScore(d)}
        toleranceLevel={toleranceLevel}
        onTimerEnd={(d) => {
          //console.log("Timer has ended! test page component will be closed.");
          setIsTimeOut(false); // Trigger termination
          }}
        />
        :
        <div style={{
          fontSize: '75px', // Much bigger font size
          fontFamily: 'fantasy', // Calculator-like font
          textAlign: 'center', // Center the text
          margin: 'auto',
          color: 'red'
       }}>
        {!isTimeOut? 'Time Out' : 'Terminated' } 
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
    {isTimeOut && isFullScreen && isFocused && cameraPermission && micPermission && (!faceRecognition || faceOffWarningCount < allowedDefaults)? 
    <>
        {showFaceWarning && 
        <FaceWarningMessage userUniqueID={userUniqueID} count={faceOffWarningCount} offFocus={faceOffFocusCount}/>
        }
        <TestComponent testID={userUniqueID} userID={globalValue} candidateName={candidateName}/>
      </>
      :
      <div>
        <WarningMessage />
      </div>
      }

      </>
      :
      <div><TestIDMissing/></div>
    }
    </div>
  );
};

export default TestPage;
