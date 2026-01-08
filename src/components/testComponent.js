import React, { useState, useEffect } from "react";
import "../testComponent.css";
import SubmittedMessage from "./submittedMessage.js";
import DisplayMessage from "./displayMessage.js";
import html2canvas from 'html2canvas';
import { QuestionDecryption, AnswerEncryption } from '../utils/encryption.js';
import performanceMonitor from '../utils/performanceMonitor.js';
/* import { useRouter } from "next/router";
 */
/* import { useNavigate } from "react-router-dom"; */

// REMOVED: Topic parsing functions are no longer needed
// Frontend now handles topics as separate entities throughout

const TestComponent = ({ testID, userID, candidateName, onProgressUpdate, navigateToQuestionRef, numberOfQuestions = 50, onSubmit }) => {
  // NEW: Bulk loading state
  const [encryptedQuestions, setEncryptedQuestions] = useState([]);
  const [encryptionKey, setEncryptionKey] = useState('');
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
  const firstQuestionLoadStartRef = React.useRef(null);
  const fetchedRef = React.useRef(false);

  // NEW: Load all questions at once with encryption
  const loadAllQuestions = async () => {
    if (fetchedRef.current) return; // Prevent double fetch
    fetchedRef.current = true;
    
    setIsInitialLoading(true);
    setLoadingError('');
    firstQuestionLoadStartRef.current = Date.now();

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
        
        // Store encrypted questions and key
        setEncryptedQuestions(parsedBody.questions);
        setEncryptionKey(parsedBody.encryption_key);
        setTotalQuestions(parsedBody.total_questions);
        setQuestionCount(parsedBody.answered_count);
        
        // Validate encryption key
        if (!QuestionDecryption.validateKey(parsedBody.questions, parsedBody.encryption_key)) {
          throw new Error('Invalid encryption key received');
        }
        
        // Decrypt and set first question
        if (parsedBody.questions.length > 0) {
          const firstQuestion = QuestionDecryption.decryptCurrentQuestion(
            parsedBody.questions, 
            0, 
            parsedBody.encryption_key
          );
          setCurrentQuestion(firstQuestion);
        }
        
        // Initialize answers array
        setAnswers(new Array(parsedBody.total_questions).fill(''));
        
        console.log(`Loaded ${parsedBody.total_questions} questions in ${Date.now() - firstQuestionLoadStartRef.current}ms`);
        
      } else if (data.statusCode === 404) {
        const errorBody = JSON.parse(data.body);
        setMessage(errorBody);
      } else {
        throw new Error(`API returned status ${data.statusCode}`);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setLoadingError(`Failed to load questions: ${error.message}`);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Load questions on component mount
  useEffect(() => {
    loadAllQuestions();
  }, [testID, candidateName]);

  // NEW: Navigate between questions (instant - no API calls)
  const navigateToQuestion = (newIndex) => {
    if (newIndex >= 0 && newIndex < encryptedQuestions.length) {
      try {
        const question = QuestionDecryption.decryptCurrentQuestion(
          encryptedQuestions, 
          newIndex, 
          encryptionKey
        );
        setCurrentQuestion(question);
        setCurrentQuestionIndex(newIndex);
      } catch (error) {
        console.error('Error decrypting question:', error);
        setLoadingError(`Failed to decrypt question ${newIndex + 1}`);
      }
    }
  };

  // NEW: Save answer locally (no immediate API call)
  const saveAnswer = (selectedAnswer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);
    
    // Auto-advance to next question
    if (currentQuestionIndex < encryptedQuestions.length - 1) {
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

  // NEW: Submit all answers with encryption
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Prepare answers for submission
      const answersToSubmit = [];
      
      for (let i = 0; i < encryptedQuestions.length; i++) {
        if (answers[i]) {
          const answerData = {
            questionID: encryptedQuestions[i].questionID,
            answer: answers[i],
            testID: testID,
            timestamp: new Date().toISOString()
          };
          answersToSubmit.push(answerData);
        }
      }
      
      // Encrypt answers for secure submission
      const encryptedAnswers = AnswerEncryption.encryptAnswers(answersToSubmit, encryptionKey);
      
      // Capture screenshot before submission
      await captureSubmissionScreenshot();

      // Submit encrypted answers
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore__",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            encrypted_answers: encryptedAnswers,
            encryption_key: encryptionKey
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
        console.error("Failed to submit test", data);
      }
    } catch (error) {
      setMessage("Error submitting test.");
      console.error("Error submitting test:", error);
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
        questionsLoaded: encryptedQuestions.length
      });
    }
  }, [currentQuestionIndex, questionCount, answers, onProgressUpdate, encryptedQuestions.length, totalQuestions]);

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
          {/* NEW: Use separate topic field directly */}
          {currentQuestion.topic && currentQuestion.topic !== '__NO_TOPIC__' && (
            <span className="question-topic-tag" aria-label={`Topic: ${currentQuestion.topic}`}>
              {currentQuestion.topic}
            </span>
          )}
        </h2>
        <p id="question-text">
          {/* NEW: Display clean question text directly */}
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

        {/* Navigation Controls */}
        <div className="navigation-controls">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="nav-button prev-button"
          >
            Previous
          </button>
          
          <span className="question-progress">
            {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          
          {currentQuestionIndex < encryptedQuestions.length - 1 ? (
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
              className="submit-button"
              style={{ backgroundColor: "#007bff" }}
            >
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </button>
          )}
        </div>
      </div>
    </div>
    )} 
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
