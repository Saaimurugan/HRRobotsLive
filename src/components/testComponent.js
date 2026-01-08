import React, { useState, useEffect } from "react";
import "../testComponent.css";
import SubmittedMessage from "./submittedMessage.js";
import DisplayMessage from "./displayMessage.js";
import html2canvas from 'html2canvas';
import questionPreloader from '../services/questionPreloader.js';
import answerQueue from '../services/answerQueue.js';
import QuestionPreloadIndicator from './QuestionPreloadIndicator.js';
import AnswerQueueIndicator from './AnswerQueueIndicator.js';
import performanceMonitor from '../utils/performanceMonitor.js';
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

const TestComponent = ({ testID, userID, candidateName, onProgressUpdate, navigateToQuestionRef, numberOfQuestions = 50, onSubmit, showPreloadIndicator = false, showAnswerQueueIndicator = false }) => {
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const questionCountSetRef = React.useRef(false); // Track if questionCount has been set
  const firstQuestionLoadStartRef = React.useRef(null); // Track first question load time
  const fetchedRef = React.useRef(false); // Prevent double fetch in StrictMode

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
      // Start timing the first question load
      firstQuestionLoadStartRef.current = performance.now();
      performanceMonitor.startTiming('First Question Load');
      fetchQuestion();
    }

    // Cleanup function to clear preloaded data when component unmounts
    return () => {
      if (testID && candidateName) {
        questionPreloader.clearPreloadedData(testID, candidateName);
        answerQueue.clearTestData(testID);
      }
    };
  }, [testID, candidateName]);

  const fetchQuestion = async (usePreloaded = true) => {
    try {
      // Try to get preloaded question first
      if (usePreloaded) {
        const preloadedData = questionPreloader.getPreloadedQuestion(testID, candidateName);
        if (preloadedData) {
          // console.log('Using preloaded question');
          setQuestions((prevQuestions) => {
            const newQuestions = [...prevQuestions, preloadedData.question];
            
            // Track first question load time
            if (newQuestions.length === 1 && firstQuestionLoadStartRef.current) {
              performanceMonitor.endTiming('First Question Load');
              const loadTime = performance.now() - firstQuestionLoadStartRef.current;
              console.log(`🎯 First question loaded in ${loadTime.toFixed(2)}ms (preloaded)`);
            }
            
            return newQuestions;
          });
          
          // Only set questionCount on the very first fetch
          if (!questionCountSetRef.current) {
            questionCountSetRef.current = true;
            setQuestionCount(preloadedData.questionCount);
          }
          
          // Start preloading the next question
          const currentQuestionNumber = questionCount + questions.length + 1;
          questionPreloader.preloadNextQuestion(testID, candidateName, currentQuestionNumber, numberOfQuestions);
          
          return;
        }
      }

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
        setQuestions((prevQuestions) => {
          const newQuestions = [...prevQuestions, question];
          
          // Track first question load time
          if (newQuestions.length === 1 && firstQuestionLoadStartRef.current) {
            performanceMonitor.endTiming('First Question Load');
            const loadTime = performance.now() - firstQuestionLoadStartRef.current;
            console.log(`🎯 First question loaded in ${loadTime.toFixed(2)}ms (API fetch)`);
          }
          
          return newQuestions;
        });
        
        // Only set questionCount on the very first fetch
        // This represents the starting question number and should not change
        // Using a ref to ensure this only happens once, regardless of React re-renders
        if (!questionCountSetRef.current) {
          questionCountSetRef.current = true;
          setQuestionCount(parsedBody.question_count);
        }
        
        // Start preloading the next question after successfully loading current one
        const currentQuestionNumber = parsedBody.question_count + questions.length + 1;
        questionPreloader.preloadNextQuestion(testID, candidateName, currentQuestionNumber, numberOfQuestions);
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
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    // Save answer locally immediately (instant UI response)
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);

    // Queue answer for background saving (no waiting)
    answerQueue.queueAnswer(testID, currentQuestion.questionID, answer);

    // Trigger preloading of next question when user answers current question
    // This is the optimal time to preload as user is engaged with current question
    const currentQuestionNumber = currentQuestionIndex + questionCount + 1;
    if (currentQuestionNumber < numberOfQuestions) {
      questionPreloader.preloadNextQuestion(testID, candidateName, currentQuestionNumber, numberOfQuestions);
    }

    // console.log(`Answer "${answer}" saved locally and queued for background sync`);
  };

  const handlePrev = async () => {
    if (isLoadingPrev || isLoadingNext) return; // Prevent during other operations
    if (currentQuestionIndex > 0) {
      setIsLoadingPrev(true);
      try {
        // Trigger background saving of current answers before navigation
        answerQueue.saveQueuedAnswers(testID);
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } finally {
        setIsLoadingPrev(false);
      }
    }
  };

  const handleNext = async () => {
    if (isLoadingNext || isLoadingPrev) return; // Prevent double-clicks and during other operations
    setIsLoadingNext(true);
    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      // Queue empty answer if no answer was selected
      if (currentQuestion && !answers[currentQuestionIndex]) {
        answerQueue.queueAnswer(testID, currentQuestion.questionID, "");
      }

      // Trigger background saving of queued answers
      answerQueue.saveQueuedAnswers(testID);
      
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
      //console.error('Error capturing submission screenshot:', error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Queue current answer if not already saved
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion && answers[currentQuestionIndex]) {
        answerQueue.queueAnswer(testID, currentQuestion.questionID, answers[currentQuestionIndex]);
      }

      // Flush all queued answers before submission (ensure all answers are saved)
      // console.log('Flushing answer queue before test submission...');
      await answerQueue.flushQueue(testID);
      // console.log('All answers saved, proceeding with test submission');

      // Capture screenshot of the page before submission
      await captureSubmissionScreenshot();

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
    {/* Question Preload Indicator (for development/debugging) */}
    <QuestionPreloadIndicator 
      testID={testID} 
      candidateName={candidateName} 
      show={showPreloadIndicator} 
    />
    
    {/* Answer Queue Indicator (for development/debugging) */}
    <AnswerQueueIndicator 
      testID={testID} 
      show={showAnswerQueueIndicator} 
    />
    
    {!isSubmitted?
    <div className="MCQOuterWrap" role="region" aria-label="Test Questions">
      {currentQuestion ?
      <>
      {(currentQuestionIndex + questionCount + 1) <= numberOfQuestions? 
        <div>
          <h2 id="question-heading">
            Question {currentQuestionIndex + questionCount + 1}
            <span aria-hidden="true">/</span>{numberOfQuestions}
            {parseQuestionTopic(currentQuestion.question).topic && (
              <span className="question-topic-tag" aria-label={`Topic: ${parseQuestionTopic(currentQuestion.question).topic}`}>{parseQuestionTopic(currentQuestion.question).topic}</span>
            )}
          </h2>
          <p id="question-text">{parseQuestionTopic(currentQuestion.question).question}</p>
          <fieldset aria-labelledby="question-heading question-text">
            <legend className="sr-only">Select your answer for question {currentQuestionIndex + questionCount + 1}</legend>
            <ul className="MCQUL" role="radiogroup" aria-label="Answer options">
              {currentQuestion.options.map((option, index) => {
                const isDisabled = isLoadingNext || isLoadingPrev;
                const isSelected = answers[currentQuestionIndex] === option;
                return (
                <li 
                  key={index} 
                  onClick={() => !isDisabled && saveAnswer(option)} 
                  className={`${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                  role="presentation"
                >
                  <input
                    type="radio"
                    id={`option-${currentQuestionIndex}-${index}`}
                    name={`question-${currentQuestionIndex}`}
                    value={option}
                    checked={isSelected}
                    onChange={() => !isDisabled && saveAnswer(option)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isDisabled}
                    aria-describedby={isSelected ? "selected-answer-status" : undefined}
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
          </fieldset>
          <span id="selected-answer-status" className="sr-only" aria-live="polite">
            {answers[currentQuestionIndex] ? `Selected answer: ${answers[currentQuestionIndex]}` : 'No answer selected'}
          </span>
          <div role="group" aria-label="Navigation buttons" style={{ marginTop: '20px' }}>
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0 || isLoadingNext || isLoadingPrev}
              style={{ backgroundColor: "#6c757d" }}
              aria-label="Go to previous question"
            >
              {isLoadingPrev ? "Loading..." : "Previous"}
            </button>&ensp;
            {(currentQuestionIndex + questionCount + 1) >= numberOfQuestions ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: "#007bff" }}
                aria-label="Submit test"
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isLoadingNext || isLoadingPrev}
                aria-label="Go to next question"
                aria-busy={isLoadingNext}
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
        <DisplayMessage message={message}/>:<p className="loading" role="status" aria-live="polite">Loading question</p>}
       </>
      }
      </div>
    :
    <SubmittedMessage />
  }</>
  );
};

export default TestComponent;
