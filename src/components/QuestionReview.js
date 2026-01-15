import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGlobalContext } from "../globalContext";
import "../QuestionReview.css";

const QuestionReview = ({ testID, showToast, onClose }) => {
  const { JWTValue, setRedirectPath, logout } = useGlobalContext();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  // Session handler
  const checkUnauthorized = useCallback((data) => {
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      setRedirectPath(location.pathname);
      if (showToast) {
        showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
      }
      logout();
      setTimeout(() => navigate('/login'), 1500);
      return true;
    }
    return false;
  }, [location.pathname, logout, navigate, setRedirectPath, showToast]);

  useEffect(() => {
    const fetchQuestionDetails = async () => {
      if (!testID) {
        setError("No test ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestionReview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ testID, token: JWTValue }),
        });

        const data = await response.json();
        if (checkUnauthorized(data)) return;

        if (data.statusCode === 200) {
          const parsed = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
          setQuestions(parsed.questions || []);
        } else {
          setError("Unable to load question details");
        }
      } catch (err) {
        setError("Failed to fetch question details");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionDetails();
  }, [testID, JWTValue, checkUnauthorized]);

  const toggleQuestion = (index) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const expandAll = () => {
    const allExpanded = {};
    questions.forEach((_, index) => {
      allExpanded[index] = true;
    });
    setExpandedQuestions(allExpanded);
  };

  const collapseAll = () => {
    setExpandedQuestions({});
  };

  const getOptionLabel = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D...
  };

  if (loading) {
    return (
      <div className="question-review-container">
        <div className="question-review-loading">
          <div className="loading-spinner"></div>
          <p>Loading question details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="question-review-container">
        <div className="question-review-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          {onClose && (
            <button className="question-review-btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="question-review-container">
      <div className="question-review-header">
        <h3>Question Review</h3>
        <div className="question-review-actions">
          <button className="question-review-btn question-review-btn--secondary" onClick={expandAll}>
            Expand All
          </button>
          <button className="question-review-btn question-review-btn--secondary" onClick={collapseAll}>
            Collapse All
          </button>
          {onClose && (
            <button className="question-review-btn question-review-btn--outline" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <div className="question-review-summary">
        <div className="summary-item">
          <span className="summary-label">Total Questions:</span>
          <span className="summary-value">{questions.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Correct:</span>
          <span className="summary-value summary-value--correct">
            {questions.filter(q => q.isCorrect).length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Incorrect:</span>
          <span className="summary-value summary-value--incorrect">
            {questions.filter(q => !q.isCorrect && q.submittedAnswer).length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Unanswered:</span>
          <span className="summary-value summary-value--unanswered">
            {questions.filter(q => !q.submittedAnswer).length}
          </span>
        </div>
      </div>

      <div className="question-review-list">
        {questions.map((q, index) => (
          <div 
            key={q.questionID || index} 
            className={`question-card ${q.isCorrect ? 'question-card--correct' : q.submittedAnswer ? 'question-card--incorrect' : 'question-card--unanswered'}`}
          >
            <div 
              className="question-card-header"
              onClick={() => toggleQuestion(index)}
            >
              <div className="question-number">
                <span className="question-index">Q{index + 1}</span>
                {q.topic && <span className="question-topic">{q.topic}</span>}
              </div>
              <div className="question-status">
                {q.isCorrect ? (
                  <span className="status-badge status-badge--correct">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Correct
                  </span>
                ) : q.submittedAnswer ? (
                  <span className="status-badge status-badge--incorrect">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Incorrect
                  </span>
                ) : (
                  <span className="status-badge status-badge--unanswered">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Unanswered
                  </span>
                )}
                <svg 
                  className={`expand-icon ${expandedQuestions[index] ? 'expanded' : ''}`}
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {expandedQuestions[index] && (
              <div className="question-card-body">
                <div className="question-text">
                  <p>{q.question}</p>
                </div>

                <div className="options-list">
                  {q.options && q.options.map((option, optIndex) => {
                    const isCorrectOption = option === q.correctAnswer;
                    const isUserAnswer = option === q.submittedAnswer;
                    
                    let optionClass = "option-item";
                    if (isCorrectOption) optionClass += " option-item--correct";
                    if (isUserAnswer && !isCorrectOption) optionClass += " option-item--wrong";
                    if (isUserAnswer && isCorrectOption) optionClass += " option-item--user-correct";

                    return (
                      <div key={optIndex} className={optionClass}>
                        <span className="option-label">{getOptionLabel(optIndex)}</span>
                        <span className="option-text">{option}</span>
                        <div className="option-indicators">
                          {isCorrectOption && (
                            <span className="indicator indicator--correct" title="Correct Answer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </span>
                          )}
                          {isUserAnswer && (
                            <span className={`indicator ${isCorrectOption ? 'indicator--user-correct' : 'indicator--user-wrong'}`} title="Your Answer">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="answer-summary">
                  <div className="answer-row">
                    <span className="answer-label">Your Answer:</span>
                    <span className={`answer-value ${q.submittedAnswer ? (q.isCorrect ? 'answer-value--correct' : 'answer-value--incorrect') : 'answer-value--none'}`}>
                      {q.submittedAnswer || "Not answered"}
                    </span>
                  </div>
                  <div className="answer-row">
                    <span className="answer-label">Correct Answer:</span>
                    <span className="answer-value answer-value--correct">{q.correctAnswer}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionReview;
