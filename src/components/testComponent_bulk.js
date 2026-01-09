import React, { useState, useEffect } from "react";
import "../testComponent.css";
import SubmittedMessage from "./submittedMessage.js";
import DisplayMessage from "./displayMessage.js";
import html2canvas from 'html2canvas';

const TestComponent = ({ testID, userID, candidateName, onProgressUpdate, navigateToQuestionRef, numberOfQuestions = 50, onSubmit, submitTestRef }) => {
  // State for questions and answers
  const [questions, setQuestions] = useState([]);
  const [groupedQuestions, setGroupedQuestions] = useState({}); // Group questions by topic
  const [topicOrder, setTopicOrder] = useState([]); // Track topic order
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  
  // Topic pagination state
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentQuestionInTopic, setCurrentQuestionInTopic] = useState(0);
  const [isTopicsCollapsed, setIsTopicsCollapsed] = useState(false);
  
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
      //console.log('Loading questions for testID:', testID, 'candidateName:', candidateName);
      
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getAllQuestionsForTest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testID, candidateName }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      //console.log('API Response:', data);

      if (data.statusCode === 200) {
        const parsedBody = JSON.parse(data.body);
        
        if (!parsedBody.questions || parsedBody.questions.length === 0) {
          throw new Error('No questions found in the response');
        }
        
        // Store questions directly (no encryption)
        setQuestions(parsedBody.questions);
        
        // Group questions by topic
        const grouped = {};
        const topics = [];
        
        parsedBody.questions.forEach((question, index) => {
          const topic = question.topic || 'General';
          
          if (!grouped[topic]) {
            grouped[topic] = [];
            topics.push(topic);
          }
          
          grouped[topic].push({
            ...question,
            originalIndex: index // Keep track of original position for navigation
          });
        });
        
        setGroupedQuestions(grouped);
        setTopicOrder(topics);
        
        setTotalQuestions(parsedBody.test_config?.max_questions || parsedBody.total_questions || numberOfQuestions);
        setQuestionCount(parsedBody.answered_count);
        
        // Set first question
        if (parsedBody.questions.length > 0) {
          setCurrentQuestion(parsedBody.questions[0]);
        }
        
        // Initialize answers array with the correct total questions count
        const actualTotalQuestions = parsedBody.test_config?.max_questions || parsedBody.total_questions || numberOfQuestions;
        setAnswers(new Array(actualTotalQuestions).fill(''));
        
        //console.log(`Loaded ${parsedBody.questions.length} questions grouped by ${topics.length} topics`);
        
      } else if (data.statusCode === 404) {
        const errorBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        setLoadingError(`Test not found: ${errorBody.message || 'Test ID not found'}`);
      } else {
        const errorBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        throw new Error(`API Error ${data.statusCode}: ${errorBody.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to load questions';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
      } else if (error.message.includes('HTTP 500')) {
        errorMessage = 'Server error: Please try again in a few moments.';
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = 'Test not found: This test may have expired or been removed.';
      } else {
        errorMessage = `Failed to load questions: ${error.message}`;
      }
      
      setLoadingError(errorMessage);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Load questions on component mount
  useEffect(() => {
    if (testID && candidateName) {
      //console.log('TestComponent mounted with:', { testID, candidateName, numberOfQuestions });
      loadAllQuestions();
    } else {
      console.error('Missing required props:', { testID, candidateName });
      setLoadingError('Missing test ID or candidate name');
      setIsInitialLoading(false);
    }
  }, [testID, candidateName]);

  // Scroll detection for collapsible topics
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsTopicsCollapsed(scrollTop > 100); // Collapse after 100px scroll
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigate between questions (topic-wise pagination)
  const navigateToQuestion = (newIndex) => {
    if (newIndex >= 0 && newIndex < questions.length) {
      setCurrentQuestion(questions[newIndex]);
      setCurrentQuestionIndex(newIndex);
      
      // Find which topic and question index within that topic
      let foundTopicIndex = 0;
      let foundQuestionInTopic = 0;
      
      for (let topicIdx = 0; topicIdx < topicOrder.length; topicIdx++) {
        const topicQuestions = groupedQuestions[topicOrder[topicIdx]] || [];
        const questionInTopicIdx = topicQuestions.findIndex(q => q.originalIndex === newIndex);
        
        if (questionInTopicIdx !== -1) {
          foundTopicIndex = topicIdx;
          foundQuestionInTopic = questionInTopicIdx;
          break;
        }
      }
      
      setCurrentTopicIndex(foundTopicIndex);
      setCurrentQuestionInTopic(foundQuestionInTopic);
    }
  };

  // Navigate to next question within current topic or next topic
  const goToNextQuestion = () => {
    const currentTopic = topicOrder[currentTopicIndex];
    const currentTopicQuestions = groupedQuestions[currentTopic] || [];
    
    if (currentQuestionInTopic < currentTopicQuestions.length - 1) {
      // Next question in same topic
      const nextQuestionInTopic = currentQuestionInTopic + 1;
      const nextGlobalIndex = currentTopicQuestions[nextQuestionInTopic].originalIndex;
      navigateToQuestion(nextGlobalIndex);
    } else if (currentTopicIndex < topicOrder.length - 1) {
      // First question of next topic
      const nextTopicIndex = currentTopicIndex + 1;
      const nextTopic = topicOrder[nextTopicIndex];
      const nextTopicQuestions = groupedQuestions[nextTopic] || [];
      if (nextTopicQuestions.length > 0) {
        const nextGlobalIndex = nextTopicQuestions[0].originalIndex;
        navigateToQuestion(nextGlobalIndex);
      }
    }
  };

  // Navigate to previous question within current topic or previous topic
  const goToPreviousQuestion = () => {
    if (currentQuestionInTopic > 0) {
      // Previous question in same topic
      const currentTopic = topicOrder[currentTopicIndex];
      const currentTopicQuestions = groupedQuestions[currentTopic] || [];
      const prevQuestionInTopic = currentQuestionInTopic - 1;
      const prevGlobalIndex = currentTopicQuestions[prevQuestionInTopic].originalIndex;
      navigateToQuestion(prevGlobalIndex);
    } else if (currentTopicIndex > 0) {
      // Last question of previous topic
      const prevTopicIndex = currentTopicIndex - 1;
      const prevTopic = topicOrder[prevTopicIndex];
      const prevTopicQuestions = groupedQuestions[prevTopic] || [];
      if (prevTopicQuestions.length > 0) {
        const prevGlobalIndex = prevTopicQuestions[prevTopicQuestions.length - 1].originalIndex;
        navigateToQuestion(prevGlobalIndex);
      }
    }
  };

  // Navigate to specific topic
  const navigateToTopic = (topicIndex) => {
    if (topicIndex >= 0 && topicIndex < topicOrder.length) {
      const topic = topicOrder[topicIndex];
      const topicQuestions = groupedQuestions[topic] || [];
      if (topicQuestions.length > 0) {
        const firstQuestionIndex = topicQuestions[0].originalIndex;
        navigateToQuestion(firstQuestionIndex);
      }
    }
  };

  // Save answer locally (no immediate API call)
  const saveAnswer = (selectedAnswer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);
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
    // First, ask parent to show confirmation modal
    if (onSubmit) {
      onSubmit();
      return; // Don't proceed with submission yet
    }
  };

  // Actual submission function that will be called after confirmation
  const performActualSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Prepare answers for submission
      const answersToSubmit = [];
      
      for (let i = 0; i < questions.length; i++) {
        if (answers[i]) {
          const answerData = {
            questionID: questions[i].questionID,
            answer: answers[i],
            testID: testID,
            timestamp: new Date().toISOString()
          };
          answersToSubmit.push(answerData);
        }
      }
      
      // Capture screenshot before submission
      await captureSubmissionScreenshot();

      // Submit answers directly (no encryption)
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore__",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            answers: answersToSubmit
          }),
        }
      );
      
      const data = await response.json();
      if (data.statusCode === 200) {
        setMessage("Test submitted successfully!");
        setIsSubmitted(true);
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

  // Create ordered questions array based on topic order
  const getOrderedQuestions = () => {
    const orderedQuestions = [];
    topicOrder.forEach(topic => {
      const topicQuestions = groupedQuestions[topic] || [];
      topicQuestions.forEach(question => {
        orderedQuestions.push({
          originalIndex: question.originalIndex,
          topic: topic,
          questionID: question.questionID
        });
      });
    });
    return orderedQuestions;
  };

  // Calculate the display question number based on ordered sequence
  const getDisplayQuestionNumber = () => {
    const orderedQuestions = getOrderedQuestions();
    const displayIndex = orderedQuestions.findIndex(q => q.originalIndex === currentQuestionIndex);
    return displayIndex !== -1 ? displayIndex + 1 : currentQuestionIndex + 1;
  };

  // Check if current question is the first in display order
  const isFirstQuestion = () => {
    const orderedQuestions = getOrderedQuestions();
    const displayIndex = orderedQuestions.findIndex(q => q.originalIndex === currentQuestionIndex);
    return displayIndex === 0;
  };

  // Check if current question is the last in display order
  const isLastQuestion = () => {
    const orderedQuestions = getOrderedQuestions();
    const displayIndex = orderedQuestions.findIndex(q => q.originalIndex === currentQuestionIndex);
    return displayIndex === orderedQuestions.length - 1;
  };

  // Report progress to parent component
  useEffect(() => {
    if (onProgressUpdate) {
      // Create ordered question list for progress dots
      const orderedQuestions = getOrderedQuestions();

      onProgressUpdate({
        currentQuestion: currentQuestionIndex,
        questionCount: 0, // No previously answered questions in bulk load
        answers,
        totalQuestions: totalQuestions,
        questionsLoaded: questions.length,
        orderedQuestions: orderedQuestions, // Add ordered questions for progress dots
        currentTopicIndex: currentTopicIndex,
        currentQuestionInTopic: currentQuestionInTopic
      });
    }
  }, [currentQuestionIndex, answers, onProgressUpdate, questions.length, totalQuestions, topicOrder, groupedQuestions, currentTopicIndex, currentQuestionInTopic]);

  // Expose navigation function to parent via ref
  useEffect(() => {
    if (navigateToQuestionRef) {
      navigateToQuestionRef.current = navigateToQuestion;
    }
  }, [navigateToQuestionRef]);

  // Expose submit function to parent via ref
  useEffect(() => {
    if (submitTestRef) {
      submitTestRef.current = performActualSubmit;
    }
  }, [submitTestRef]);

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
      <div className="test-skeleton-container">
        <div className="skeleton-header">
          <div className="skeleton-loader skeleton-title"></div>
          <div className="skeleton-stats">
            <div className="skeleton-stat">
              <div className="skeleton-loader skeleton-stat-number"></div>
              <div className="skeleton-loader skeleton-stat-label"></div>
            </div>
            <div className="skeleton-stat">
              <div className="skeleton-loader skeleton-stat-number"></div>
              <div className="skeleton-loader skeleton-stat-label"></div>
            </div>
            <div className="skeleton-stat">
              <div className="skeleton-loader skeleton-stat-number"></div>
              <div className="skeleton-loader skeleton-stat-label"></div>
            </div>
          </div>
        </div>
        
        <div className="skeleton-nav-bar">
          <div className="skeleton-loader skeleton-nav-title"></div>
          <div className="skeleton-nav-buttons">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton-loader skeleton-topic-button"></div>
            ))}
          </div>
          <div className="skeleton-question-dots">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="skeleton-loader skeleton-question-dot"></div>
            ))}
          </div>
        </div>
        
        <div className="skeleton-question-container">
          <div className="skeleton-question-header">
            <div className="skeleton-loader skeleton-topic-title"></div>
            <div className="skeleton-loader skeleton-question-info"></div>
          </div>
          <div className="skeleton-loader skeleton-question-text"></div>
          <div className="skeleton-options">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton-loader skeleton-option"></div>
            ))}
          </div>
          <div className="skeleton-navigation">
            <div className="skeleton-loader skeleton-nav-button"></div>
            <div className="skeleton-loader skeleton-progress-text"></div>
            <div className="skeleton-loader skeleton-nav-button"></div>
          </div>
        </div>
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
    {!isSubmitted && !isInitialLoading && !loadingError && questions.length > 0 && (
    <div className="MCQOuterWrap" role="region" aria-label="Test Questions">
      
      {/* Topic Navigation Bar with Counts */}
      <div className={`topic-navigation-bar ${isTopicsCollapsed ? 'collapsed' : ''}`}>
        <div className="nav-header">
          <h3 className="nav-title">Topics</h3>
          <button 
            className="nav-submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            title="Submit test - you can submit at any time"
          >
            {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
          </button>
          <div className="nav-stats">
            <div className="stat-item">
              <span className="stat-number">{questions.length}</span>
              <span className="stat-label">Total Questions</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{answers.filter(a => a && a !== '').length}</span>
              <span className="stat-label">Answered</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{topicOrder.length}</span>
              <span className="stat-label">Topics</span>
            </div>
          </div>
          <button 
            className="collapse-toggle"
            onClick={() => setIsTopicsCollapsed(!isTopicsCollapsed)}
            aria-label={isTopicsCollapsed ? 'Expand topics' : 'Collapse topics'}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={`collapse-icon ${isTopicsCollapsed ? 'rotated' : ''}`}
            >
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </button>
        </div>
        
        <div className={`topic-nav-buttons ${isTopicsCollapsed ? 'hidden' : ''}`}>
          {topicOrder.map((topic, topicIndex) => {
            const topicQuestions = groupedQuestions[topic] || [];
            const answeredInTopic = topicQuestions.filter(q => answers[q.originalIndex] && answers[q.originalIndex] !== '').length;
            const isCurrentTopic = topicIndex === currentTopicIndex;
            
            return (
              <button
                key={topic}
                className={`topic-nav-button ${isCurrentTopic ? 'current-topic' : ''}`}
                onClick={() => navigateToTopic(topicIndex)}
                title={`${topic} (${answeredInTopic}/${topicQuestions.length} answered)`}
              >
                {topic} ({answeredInTopic}/{topicQuestions.length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Topic Display */}
      {topicOrder.length > 0 && currentTopicIndex < topicOrder.length && (
        <div className="current-topic-container">
          <div className="topic-section">
            <div className="topic-header">
              <h2 className="topic-title">{topicOrder[currentTopicIndex]}</h2>
              <div className="topic-stats">
                <span className="topic-question-count">
                  Question {getDisplayQuestionNumber()} of {questions.length}
                </span>
                <span className="topic-progress">
                  Topic {currentTopicIndex + 1} of {topicOrder.length}
                </span>
              </div>
            </div>
            
            {/* Current Question Display */}
            {currentQuestion && (
              <div className="current-question-display">
                <div className="question-card current-question">
                  <div className="question-header">
                    <span className="question-number">Q{getDisplayQuestionNumber()}</span>
                    <div className="question-title-container">
                      <h3 className="question-text">{currentQuestion.question}</h3>
                      <span className={`question-status ${answers[currentQuestionIndex] && answers[currentQuestionIndex] !== '' ? 'answered' : 'unanswered'}`}>
                        {answers[currentQuestionIndex] && answers[currentQuestionIndex] !== '' ? '✓' : '○'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="question-content">
                    
                    <fieldset className="question-options">
                      <legend className="sr-only">Select your answer for question {getDisplayQuestionNumber()}</legend>
                      <ul className="options-list" role="radiogroup">
                        {currentQuestion.options?.map((option, optionIndex) => {
                          const isSelected = answers[currentQuestionIndex] === option;
                          return (
                            <li 
                              key={optionIndex} 
                              onClick={() => saveAnswer(option)}
                              className={`option-item ${isSelected ? 'selected' : ''}`}
                              role="presentation"
                            >
                              <input
                                type="radio"
                                id={`q${currentQuestionIndex}-option-${optionIndex}`}
                                name={`question-${currentQuestionIndex}`}
                                value={option}
                                checked={isSelected}
                                onChange={() => saveAnswer(option)}
                              />
                              <label htmlFor={`q${currentQuestionIndex}-option-${optionIndex}`} className="option-label">
                                <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                                <span className="option-text">{option}</span>
                              </label>
                            </li>
                          );
                        }) || []}
                      </ul>
                    </fieldset>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="navigation-controls">
        <button
          onClick={goToPreviousQuestion}
          disabled={isFirstQuestion()}
          className="nav-button prev-button"
        >
          Previous
        </button>
        
        <span className="question-progress">
          Question {getDisplayQuestionNumber()} of {questions.length} - {topicOrder[currentTopicIndex]}
        </span>
        
        {/* Check if we're at the last question */}
        {isLastQuestion() ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="submit-button"
            style={{ backgroundColor: "#007bff" }}
          >
            {isSubmitting ? "Submitting..." : "Submit Test"}
          </button>
        ) : (
          <button
            onClick={goToNextQuestion}
            className="nav-button next-button"
          >
            {isLastQuestion() ? 'Last Question' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
    )}

    {/* No Questions Available */}
    {!isSubmitted && !isInitialLoading && !loadingError && questions.length === 0 && (
      <div className="error-container">
        <h3>No Questions Available</h3>
        <p>No questions were found for this test. Please contact support.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )}

    {/* Message Display */}
    {message && <DisplayMessage message={message} />}
    
    {/* Submitted State */}
    {isSubmitted && <SubmittedMessage />}
    </>
  );
};

export default TestComponent;