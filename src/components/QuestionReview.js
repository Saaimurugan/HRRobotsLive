import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGlobalContext } from "../globalContext";
import "../QuestionReview.css";

const QuestionReview = ({ testID, isPsychometricReport = false, showToast, onClose }) => {
  const { JWTValue, setRedirectPath, logout } = useGlobalContext();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

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
          headers: { "Content-Type": "application/json" },
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
    setExpandedQuestions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const expandAll = () => {
    const allExpanded = {};
    questions.forEach((_, index) => { allExpanded[index] = true; });
    setExpandedQuestions(allExpanded);
  };

  const collapseAll = () => setExpandedQuestions({});

  const getOptionLabel = (index) => String.fromCharCode(65 + index);

  const correctCount = questions.filter(q => q.isCorrect).length;
  const incorrectCount = questions.filter(q => !q.isCorrect && q.submittedAnswer && q.correctAnswer).length;
  const unansweredCount = questions.filter(q => !q.submittedAnswer).length;

  if (loading) {
    return (
      <div className="question-review-container">
        <div className="question-review-loading">
          <div className="loading-spinner"></div>
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="question-review-container">
        <div className="question-review-error">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
          {onClose && (
            <button className="question-review-btn" onClick={onClose}>Close</button>
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
        <div className="summary-stat">
          <span className="summary-stat-value">{questions.length}</span>
          <span className="summary-stat-label">Total</span>
        </div>
        {!isPsychometricReport && (
          <>
            <div className="summary-stat">
              <span className="summary-stat-value summary-stat-value--correct">{correctCount}</span>
              <span className="summary-stat-label">Correct</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-value summary-stat-value--incorrect">{incorrectCount}</span>
              <span className="summary-stat-label">Incorrect</span>
            </div>
          </>
        )}
        <div className="summary-stat">
          <span className="summary-stat-value summary-stat-value--unanswered">{unansweredCount}</span>
          <span className="summary-stat-label">Skipped</span>
        </div>
      </div>

      <div className="question-review-list">
        {questions.map((q, index) => {
          const isExpanded = expandedQuestions[index];
          // For psychometric reports, don't show incorrect status if there's no correct answer
          const hasCorrectAnswer = q.correctAnswer && q.correctAnswer.trim() !== '';
          const statusClass = isPsychometricReport && !hasCorrectAnswer 
            ? (q.submittedAnswer ? 'answered' : 'unanswered')
            : (q.isCorrect ? 'correct' : q.submittedAnswer ? 'incorrect' : 'unanswered');
          
          return (
            <div key={q.questionID || index} className={`question-card question-card--${statusClass}`}>
              <div className="question-card-header" onClick={() => toggleQuestion(index)}>
                <div className="question-info">
                  <div className={`question-number-badge ${isPsychometricReport ? 'question-number-badge--psychometric' : ''}`}>{index + 1}</div>
                  <div className="question-meta">
                    <div className="question-preview">{q.question}</div>
                    {q.topic && <div className="question-topic-label">{q.topic}</div>}
                  </div>
                </div>
                <div className="question-status-area">
                  {!isPsychometricReport || hasCorrectAnswer ? (
                    <span className={`status-indicator status-indicator--${statusClass}`}>
                      {q.isCorrect ? 'Correct' : q.submittedAnswer ? 'Incorrect' : 'Skipped'}
                    </span>
                  ) : (
                    <span className={`status-indicator status-indicator--${statusClass}`}>
                      {q.submittedAnswer ? 'Answered' : 'Skipped'}
                    </span>
                  )}
                  <svg 
                    className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}
                    width="20" height="20" viewBox="0 0 24 24" 
                    fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="question-card-body">
                  <div className="question-content">
                    <p className="question-full-text">{q.question}</p>
                    
                    <div className="options-container">
                      {q.options && q.options.map((option, optIndex) => {
                        const isCorrectOption = option === q.correctAnswer;
                        const isUserAnswer = option === q.submittedAnswer;
                        
                        let rowClass = "option-row";
                        if (isCorrectOption && isUserAnswer) rowClass += " option-row--user-correct";
                        else if (isCorrectOption) rowClass += " option-row--correct-answer";
                        else if (isUserAnswer) rowClass += " option-row--user-wrong";

                        return (
                          <div key={optIndex} className={rowClass}>
                            <span className="option-letter">{getOptionLabel(optIndex)}</span>
                            <span className="option-content">{option}</span>
                            <div className="option-badges">
                              {isCorrectOption && (
                                <span className="option-badge option-badge--correct">Correct</span>
                              )}
                              {isUserAnswer && (
                                <span className="option-badge option-badge--your-answer">Your Answer</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="answer-comparison">
                      <div className="comparison-item">
                        <span className="comparison-label">Your Answer</span>
                        <span className={`comparison-value ${q.submittedAnswer ? (q.isCorrect ? 'comparison-value--correct' : 'comparison-value--incorrect') : 'comparison-value--none'}`}>
                          {q.submittedAnswer || "Not answered"}
                        </span>
                      </div>
                      {(!isPsychometricReport || (q.correctAnswer && q.correctAnswer.trim() !== '')) && (
                        <div className="comparison-item">
                          <span className="comparison-label">Correct Answer</span>
                          <span className="comparison-value comparison-value--correct">{q.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionReview;
