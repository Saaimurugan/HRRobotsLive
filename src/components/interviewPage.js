import React, { useState, useEffect } from "react";
import CameraCapture from './cam.js';
import WarningMessage from "./warningMessage.js";
import TestIDMissing from "./testIDMissing.js";
import SubmittedMessage from "./submittedMessage.js";
import FaceTracking from "./faceDetection.js";
import "../App.css";
import AIInterviewComponent from "./aiInterviewComponent.js";
import ChatBot from "./chatBot.js";

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

const InterviewPage = () => {
  const [userUniqueID, setUserUniqueID] = useState('');
  const [userUniqueIDPresent, setUserUniqueIDPresent] = useState(false);

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [micPermission, setMicPermission] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveAnswers, setSaveAnswers] = useState([]);

  // Detect full-screen changes
  const onFullScreenChange = () => {
    const isFull = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    setIsFullScreen(!!isFull); // True if in full screen, false otherwise
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

  const sanitizeName = (name) => {
    // Remove special characters, spaces, and add a timestamp
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    return `${sanitized}_${timestamp}`;
  };

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

if (userUniqueID != '')
{
    if (!isQuizStarted) 
      {
      requestCameraAndMic();
      return (
        <div 
        style={{
          fontFamily: "'Roboto', sans-serif",
          maxWidth: "600px",
          margin: "auto",
          padding: "10px",
          background: "#f9f9f9",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          marginTop: "100px"
        }}
        >
        <div>
        <main style={{ padding: "20px;" }}>
        <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
          marginTop: '10px',
          position: 'relative',
        }}
      >
        <p style={{ fontSize: '16px', color: '#333' }}>
          Please grant access to the camera and microphone if it has not been granted already.
        </p>
        <div style={{ marginBottom: '20px' }}>
          <p>
            <strong>Camera and mic status:</strong>
          </p>
          <p>
            Camera Permission: <span style={{ color: cameraPermission ? 'green' : 'red' }}>
            {cameraPermission === null
              ? "Not Requested"
              : cameraPermission
              ? "Granted"
              : "Denied"}
              </span>
          </p>
          <p>
          Microphone Permission: <span style={{ color: micPermission ? 'green' : 'red' }}>
            {micPermission === null
              ? "Not Requested"
              : micPermission
              ? "Granted"
              : "Denied"}
              </span>
          </p>
        </div>
      </div>
        </main>
          <h3 style={{ fontsize: "18px", color: "#444" }}>Test Guidelines</h3>
          <p><i>Once the test begins, please do not exit fullscreen mode or open any other window. The test will be terminated for the following reasons:</i></p>
          <ul>
            <li>The camera must remain on, and access should not be denied.</li>
            <li>The microphone must remain on, and access should not be denied.</li>
            <li>Fullscreen mode must not be exited.</li>
            <li>Another window must not be opened, and the window focus must not change.</li>
          </ul>
          {cameraPermission && micPermission
          ?
          <>
          <button
            onClick={startQuiz}
            style={{
              backgroundColor: '#1CBBB4',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            I Accept and Start Test
          </button></>
              :""}
        </div>
        </div>
      );
    }
  }
  else
  {
    <div><TestIDMissing /></div>
  }
  
  return (
    <div style={{ background:"white", overflow: "hidden", minHeight: "100vh", fontFamily: "Roboto, Arial, sans-serif", padding: "0px" }}>
      { !isSubmitted && userUniqueIDPresent?
      <>
      <div
        style={{
          background: "linear-gradient(132deg, rgb(227, 244, 253) 0.00%, rgb(170, 209, 226) 100.00%)",
					marginTop: "80px",																		
          padding: "0 5px 0",
          color: "black",
          display: "flex",
          alignItems: "center",
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
        {/*<CameraCapture userUniqueID={userUniqueID}/>*/}
        <FaceTracking/>
      </div>
      </>
      :
      <></>
      }

    { userUniqueIDPresent ?
    <>
     { isFullScreen && isFocused && cameraPermission && micPermission && !isSubmitted? 
       <AIInterviewComponent/>
      :
      <div>
        { !isSubmitted?
        <WarningMessage />
        :
        <SubmittedMessage />
        }
        </div>
      }
      </>
      :
      <div><TestIDMissing/></div>
    }
    </div>
  );
};

export default InterviewPage;
