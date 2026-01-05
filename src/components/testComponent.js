import React, { useState, useEffect } from "react";
import "../testComponent.css";
import SubmittedMessage from "./submittedMessage.js";
import DisplayMessage from "./displayMessage.js";
import html2canvas from 'html2canvas';
/* import { useRouter } from "next/router";
 */
/* import { useNavigate } from "react-router-dom"; */

// Helper function to parse topic from question
const parseQuestionTopic = (questionText) => {
  if (questionText && questionText.includes(':::')) {
    const [topic, ...rest] = questionText.split(':::');
    return { topic: topic.trim(), question: rest.join(':::').trim() };
  }
  return { topic: '', question: questionText };
};

const TestComponent = ({ testID, userID, candidateName, onProgressUpdate, navigateToQuestionRef, numberOfQuestions = 50, onSubmit }) => {
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const questionCountSetRef = React.useRef(false); // Track if questionCount has been set

  /* const router = useRouter();
 */
/*   const navigate = useNavigate();
 */  const handlePreventDefault = (event) => {
    event.preventDefault();
    alert("Action disabled!");
  };

  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        window.location.href = "https://hrrobots.com";
/*         router.push("https://hrrobots.com");
 */      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isSubmitted]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        window.location.href = "https://hrrobots.com";
/*         router.push("https://hrrobots.com");
 */      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchedRef = React.useRef(false);

  // Report progress to parent component
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate({
        currentQuestion: currentQuestionIndex,
        questionCount,
        answers,
        totalQuestions: numberOfQuestions,
        questionsLoaded: questions.length
      });
    }
  }, [currentQuestionIndex, questionCount, answers, onProgressUpdate, questions.length, numberOfQuestions]);

  // Expose navigation function to parent via ref
  useEffect(() => {
    if (navigateToQuestionRef) {
      navigateToQuestionRef.current = (questionNum) => {
        // questionNum is 1-based (1-50), convert to index based on questionCount
        // questionCount is the number of previously answered questions
        // So question (questionCount + 1) is at index 0
        const targetIndex = questionNum - questionCount - 1;
        // Only navigate if the question has been loaded
        if (targetIndex >= 0 && targetIndex < questions.length) {
          setCurrentQuestionIndex(targetIndex);
        }
      };
    }
  }, [navigateToQuestionRef, questionCount, questions.length]);

  useEffect(() => {
    // Fetch the first question when the component loads (prevent double fetch in StrictMode)
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchQuestion();
    }
  }, []);

  const fetchQuestion = async () => {
    try {
      //console.log("Fetching question for testID:", testID, "and candidateName:", candidateName);
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestionsTopic",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testID, candidateName }),
        }
      );
      const data = await response.json();
      //console.log("Fetch question response:", data);
      if (data.statusCode === 200) {
        const parsedBody = JSON.parse(data.body);
        const question = parsedBody.new_question;
        setQuestions((prevQuestions) => [...prevQuestions, question]);
        // Only set questionCount on the very first fetch
        // This represents the starting question number and should not change
        // Using a ref to ensure this only happens once, regardless of React re-renders
        if (!questionCountSetRef.current) {
          questionCountSetRef.current = true;
          setQuestionCount(parsedBody.question_count);
        }
      }
      else if (data.statusCode === 404) {
        setMessage(data.body);
        //console.error(data.body);
      } else {
        setMessage("Failed to fetch question: " + data.statusCode + " - " + JSON.stringify(data.body));
        //console.error("Failed to fetch question", data);
      }
    } catch (error) {
      setMessage("Failed to fetch question: " + error.message);
      //console.error("Error fetching question:", error);
    }
  };

  const saveAnswer = async (answer) => {
    if (isSavingAnswer || isLoadingNext || isLoadingPrev) return; // Prevent saving during navigation
    
    const currentQuestion = questions[currentQuestionIndex];
    setIsSavingAnswer(true);

    // Save the answer locally
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);

    // Call API to save the answer
    try {
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveAnswerSubmitted",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            questionID: currentQuestion.questionID,
            answer,
          }),
        }
      );
      const data = await response.json();
      if (data.statusCode === 200)
      {
        setSavedQuestions((prevQuestionIDs) => [...prevQuestionIDs, currentQuestion.questionID]);
      }

      if (data.statusCode !== 200) {
        setMessage("Failed to save answer: " + data.statusCode + "-" + data.body);
        //console.error("Failed to save answer", data);
      }
    } catch (error) {
      setMessage("Failed to save answer: " + error.message);
      //console.error("Error saving answer:", error);
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handlePrev = async () => {
    if (isLoadingPrev || isLoadingNext || isSavingAnswer) return; // Prevent during other operations
    if (currentQuestionIndex > 0) {
      setIsLoadingPrev(true);
      try {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } finally {
        setIsLoadingPrev(false);
      }
    }
  };

  const handleNext = async () => {
    if (isLoadingNext || isLoadingPrev || isSavingAnswer) return; // Prevent double-clicks and during other operations
    setIsLoadingNext(true);
    try {
      //check whether setSavedQuestionCount has the currentQuestion.questionID
      //console.log("savedQuestions: ", savedQuestions);
      //console.log("currentQuestion.questionID: ", currentQuestion.questionID);
      if (!savedQuestions.includes(currentQuestion.questionID)) {
        //console.log("Saving answer for question: ", currentQuestion.questionID);
        await saveAnswer("");
      }
      
      // If we already have the next question loaded, just move to it
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // Only fetch a new question if we're at the end of loaded questions
        await fetchQuestion();
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } finally {
      setIsLoadingNext(false);
    }
  };

  // Capture screenshot of the page before final submission
  const captureSubmissionScreenshot = async () => {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.7);
      
      // Save the submission screenshot
      await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData, 
          userUniqueID: testID, 
          captureType: 'final_submission_screenshot',
          outputQuality: 100
        }),
      });
    } catch (error) {
      // Continue even if screenshot fails
      console.error('Error capturing submission screenshot:', error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Save the current answer before submitting if not already saved
      if (currentQuestion && !savedQuestions.includes(currentQuestion.questionID)) {
        await saveAnswer(answers[currentQuestionIndex] || "");
      }

      // Capture screenshot of the page before submission
      await captureSubmissionScreenshot();

/*       const correctAnswers = answers.reduce((total, answer, index) => {
        return answer === questions[index].correctAnswer ? total + 1 : total;
      }, 0);
 */
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({testID}),
        }
      );
      const data = await response.json();
      if (data.statusCode === 200) {
        setMessage("Test submitted successfully!");
        setIsSubmitted(true);
        if (onSubmit) onSubmit(); // Notify parent that test is submitted
        //alert("Test submitted successfully!");
      } else {
        setMessage("Failed to submit test, please take screenshot and contact support.");
        //console.error("Failed to submit test", data);
      }
    } catch (error) {
      setMessage("Error submitting test.");
      //console.error("Error submitting test:", error);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <>
    {!isSubmitted?
    <div className="MCQOuterWrap">
      {currentQuestion ?
      <>
      {(currentQuestionIndex + questionCount + 1) <= numberOfQuestions? 
        <div>{/* {currentQuestionIndex} - {questionCount} -  */}
          <h2>
            Question {currentQuestionIndex + questionCount + 1}
            /{numberOfQuestions}
            {parseQuestionTopic(currentQuestion.question).topic && (
              <span className="question-topic-tag">{parseQuestionTopic(currentQuestion.question).topic}</span>
            )}
          </h2>
          <p>{parseQuestionTopic(currentQuestion.question).question}</p>
          <ul className="MCQUL">
            {currentQuestion.options.map((option, index) => {
              const isDisabled = isLoadingNext || isLoadingPrev || isSavingAnswer;
              return (
              <li key={index} onClick={() => !isDisabled && saveAnswer(option)} className={isDisabled ? 'disabled' : ''}>
                <input
                  type="radio"
                  id={`option-${currentQuestionIndex}-${index}`}
                  name={`question-${currentQuestionIndex}`}
                  value={option}
                  checked={answers[currentQuestionIndex] === option}
                  onChange={() => !isDisabled && saveAnswer(option)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isDisabled}
                />
                <label 
                  htmlFor={`option-${currentQuestionIndex}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) saveAnswer(option);
                  }}
                >
                  {option}
                </label>
              </li>
            )})}
          </ul>
          <div>
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0 || isLoadingNext || isLoadingPrev || isSavingAnswer}
              style={{ backgroundColor: "#6c757d" }}
            >
              {isLoadingPrev ? "Loading..." : "Previous"}
            </button>&ensp;
            {(currentQuestionIndex + questionCount + 1) >= numberOfQuestions ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isSavingAnswer}
                style={{ backgroundColor: "#007bff" }}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isLoadingNext || isLoadingPrev || isSavingAnswer}
              >{isLoadingNext ? "Loading..." : "Next"}
              </button>
            )}
          </div>
        </div>
        :
        <DisplayMessage message={message}/>
      }
      </>
       :  
       <>    
       {message?
        <DisplayMessage message={message}/>:<p className="loading">Loading question</p>}
       </>
      }
      </div>
    :
    <SubmittedMessage />
  }</>
  );
};

export default TestComponent;
