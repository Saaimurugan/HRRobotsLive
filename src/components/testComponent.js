import React, { useState, useEffect } from "react";
import "../testComponent.css";
import SubmittedMessage from "./submittedMessage.js";
import DisplayMessage from "./displayMessage.js";
import html2canvas from 'html2canvas';

const TestComponent = ({ testID, userID, candidateName, onProgressUpdate, navigateToQuestionRef, numberOfQuestions = 50, onSubmit }) => {
  // State for questions and answers
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  
  // Existing state
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(numberOfQuestions);
  
  // Refs for tracking
  const fetchedRef = React.useRef(false);

  // Load all questions at once (no encryption)
  const loadAllQuestions = async () => {
    if (fetchedRef.current) return; // Prevent double fetch
    fetchedRef.current = true;
    
    setIsInitialLoading(true);
    setLoadingError('');

    try {
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getAllQuestionsForTest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testID, candidateName }),
        }
      );

      const data = await response.json();

      if (data.statusCode === 200) {
        const parsedBody = JSON.parse(data.body);
        
        // Store questions directly (no encryption)
        setQuestions(parsedBody.questions);
        setTotalQuestions(parsedBody.total_questions);
        setQuestionCount(parsedBody.answered_count);
        
        // Set first question
        if (parsedBody.questions.length > 0) {
          setCurrentQuestion(parsedBody.questions[0]);
        }
        
        // Initialize answers array
        setAnswers(new Array(parsedBody.total_questions).fill(''));
        
        //console.log(`Loaded ${parsedBody.total_questions} questions`);
        
      } else if (data.statusCode === 404) {
        const errorBody = JSON.parse(data.body);
        setMessage(errorBody);
      } else {
        throw new Error(`API returned status ${data.statusCode}`);
      }
    } catch (error) {
      //console.error('Error loading questions:', error);
      setLoadingError(`Failed to load questions: ${error.message}`);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Load questions on component mount
  useEffect(() => {
    loadAllQuestions();
  }, [testID, candidateName]);

  // Navigate between questions (instant - no API calls)
  const navigateToQuestion = (newIndex) => {
    if (newIndex >= 0 && newIndex < questions.length) {
      setCurrentQuestion(questions[newIndex]);
      setCurrentQuestionIndex(newIndex);
    }
  };

  // Save answer locally and to backend
  const saveAnswer = async (selectedAnswer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);
    
    // Save answer to backend via saveAnswerSubmitted API
    try {
      await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveAnswerSubmitted",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID: testID,
            questionID: currentQuestion.questionID,
            answer: selectedAnswer
          }),
        }
      );
    } catch (error) {
      console.error('Error saving answer:', error);
    }
    
    // Auto-advance to next question
    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        navigateToQuestion(currentQuestionIndex + 1);
      }, 500); // Small delay for better UX
    }
  };

  // Navigation functions
  const goToNextQuestion = () => {
    navigateToQuestion(currentQuestionIndex + 1);
  };

  const goToPreviousQuestion = () => {
    navigateToQuestion(currentQuestionIndex - 1);
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

  // Submit all answers (no encryption)
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Capture screenshot before submission
      await captureSubmissionScreenshot();

      // Submit test - answers are already saved by saveAnswerSubmitted
      // Just trigger score calculation
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore__",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            answers: [] // Empty - answers already saved incrementally
          }),
        }
      );
      
      const data = await response.json();
      if (data.statusCode === 200) {
        setMessage("Test submitted successfully!");
        setIsSubmitted(true);
        if (onSubmit) onSubmit(); // Notify parent that test is submitted
      } else {
        setMessage("Failed to submit test, please take screenshot and contact support.");
        //console.error("Failed to submit test", data);
      }
    } catch (error) {
      setMessage("Error submitting test.");
      //console.error("Error submitting test:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report progress to parent component
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate({
        currentQuestion: currentQuestionIndex,
        questionCount,
        answers,
        totalQuestions: totalQuestions,
        questionsLoaded: questions.length
      });
    }
  }, [currentQuestionIndex, questionCount, answers, onProgressUpdate, questions.length, totalQuestions]);

  // Expose navigation function to parent via ref
  useEffect(() => {
    if (navigateToQuestionRef) {
      navigateToQuestionRef.current = navigateToQuestion;
    }
  }, [navigateToQuestionRef]);

  // Handle redirect after submission or error
  useEffect(() => {
    if (isSubmitted || message) {
      const timer = setTimeout(() => {
        window.location.href = "https://hrrobots.com";
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, message]);

  return (
    <>
    {/* Loading State */}
    {isInitialLoading && (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your test questions...</p>
      </div>
    )}
    
    {/* Error State */}
    {loadingError && (
      <div className="error-container">
        <h3>Error Loading Test</h3>
        <p>{loadingError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )}
    
    {/* Test Interface */}
    {!isSubmitted && !isInitialLoading && !loadingError && currentQuestion && (
    <div className="MCQOuterWrap" role="region" aria-label="Test Questions">
      <div>
        <h2 id="question-heading">
          Question {currentQuestionIndex + 1}
          <span aria-hidden="true">/</span>{totalQuestions}
          {currentQuestion.topic && currentQuestion.topic !== '__NO_TOPIC__' && (
            <span className="question-topic-tag" aria-label={`Topic: ${currentQuestion.topic}`}>
              {currentQuestion.topic}
            </span>
          )}
        </h2>
        <p id="question-text">
          {currentQuestion.question}
        </p>
        <fieldset aria-labelledby="question-heading question-text">
          <legend className="sr-only">Select your answer for question {currentQuestionIndex + 1}</legend>
          <ul className="MCQUL" role="radiogroup" aria-label="Answer options">
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestionIndex] === option;
              return (
              <li 
                key={index} 
                onClick={() => saveAnswer(option)} 
                className={`${isSelected ? 'selected' : ''}`}
                role="presentation"
              >
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="answer"
                  value={option}
                  checked={isSelected}
                  onChange={() => saveAnswer(option)}
                  aria-describedby="question-text"
                />
                <label htmlFor={`option-${index}`} className="option-label">
                  {option}
                </label>
              </li>
              );
            })}
          </ul>
        </fieldset>

        {/* Fixed Navigation Buttons */}
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="nav-button prev-button"
        >
          Previous
        </button>
        
        {currentQuestionIndex < questions.length - 1 ? (
          <button
            onClick={goToNextQuestion}
            className="nav-button next-button"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="nav-button next-button submit-nav-button"
            style={{ backgroundColor: "#007bff" }}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
    )}

    {/* Message Display */}
    {message && <DisplayMessage message={message}/>}
    
    {/* Submitted State */}
    {isSubmitted && <SubmittedMessage />}
    </>
  );
};

export default TestComponent;