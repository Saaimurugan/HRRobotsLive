import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GaugeChart from "react-gauge-chart";
import PhotoCatolog from "./photoCatolog";
import { useGlobalContext } from "../globalContext";

const ScoreChart = ({ message, showToast }) => {
  const { JWTValue, setRedirectPath, logout } = useGlobalContext();
  const [topicScores, setTopicScores] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
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
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized") {
          setRedirectPath(location.pathname);
          if (showToast) {
            showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
          }
          logout();
          setTimeout(() => navigate('/login'), 1500);
          return true;
        }
      } catch (e) {}
    }
    return false;
  }, [location.pathname, logout, navigate, setRedirectPath, showToast]);

  const parsedBody = message;
  const { testID, candidateName, templateName, submittedAt, totalQuestions: configTotalQuestions } = parsedBody || {};
  
  // Always prioritize the totalQuestions from the backend response
  // This should be the configured numberOfQuestions value (e.g., 10)
  const backendTotalQuestions = parsedBody?.totalQuestions || configTotalQuestions;
  
  // Calculate totals from topic scores when available, otherwise fall back to message data
  const calculatedTotals = topicScores.length > 0 
    ? {
        totalQuestions: backendTotalQuestions || 10, // Use backend value, fallback to 10
        correctAnswers: topicScores.reduce((acc, topic) => acc + (topic.correct || 0), 0),
        submittedAnswers: topicScores.reduce((acc, topic) => acc + (topic.attempted || 0), 0),
      }
    : {
        totalQuestions: backendTotalQuestions || 10, // Use backend value, fallback to 10
        correctAnswers: parsedBody?.correctAnswers || 0,
        submittedAnswers: parsedBody?.submittedAnswers || 0,
      };

  // console.log('DEBUG ScoreChart - parsedBody:', parsedBody);
  // console.log('DEBUG ScoreChart - backendTotalQuestions:', backendTotalQuestions);
  // console.log('DEBUG ScoreChart - calculatedTotals:', calculatedTotals);

  const { totalQuestions, correctAnswers, submittedAnswers } = calculatedTotals;
  const scorePercent = totalQuestions ? correctAnswers / totalQuestions : 0;

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    const fetchTopicScores = async () => {
      if (!testID) return;
      setLoadingTopics(true);
      try {
        const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTopicScore", {
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
          setTopicScores(parsed || []);
        }
      } catch (error) {
        //console.error("Error fetching topic scores:", error);
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopicScores();
  }, [testID, JWTValue, checkUnauthorized]);

  if (!message) return null;

  return (
    <div className="score-chart-wrapper">
      {/* Top Info Bar */}
      <div className="candidate-info-bar">
        <div className="info-item">
          <span className="info-label">Candidate:</span>
          <span className="info-value">{candidateName || "N/A"}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Template:</span>
          <span className="info-value">{templateName || "N/A"}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Date & Time:</span>
          <span className="info-value">{formatDateTime(submittedAt)}</span>
        </div>
      </div>

      <div className="score-chart-container">
        {/* Gauge + Score Details Section */}
        <div className="gauge-details-card">
          <div className="gauge-wrapper">
            <GaugeChart
              id="score-gauge"
              nrOfLevels={20}
              colors={["#ef4444", "#f59e0b", "#22c55e"]}
              arcWidth={0.25}
              percent={scorePercent}
              textColor="#1f2937"
              needleColor="#374151"
              needleBaseColor="#374151"
              animate={true}
              formatTextValue={() => `${(scorePercent * 100).toFixed(0)}%`}
            />
          </div>
          <p className="score-summary">
            Score: {correctAnswers} / {totalQuestions} ({(scorePercent * 100).toFixed(1)}%)
          </p>

          <div className="candidate-details-inline">
            <div className="detail-row">
              <span className="detail-label">Total Questions:</span>
              <span className="detail-value">{totalQuestions}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Attempted:</span>
              <span className="detail-value">{submittedAnswers}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Correct Answers:</span>
              <span className="detail-value">{correctAnswers}</span>
            </div>
          </div>
        </div>

      {/* Topic Score Table + Photos */}
      <div className="topic-photos-column">
        <div className="topic-table-section">
          {loadingTopics ? (
            <p>Loading topic scores...</p>
          ) : topicScores.length > 0 ? (
            <table className="topic-score-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Attempted</th>
                  <th>Correct</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {topicScores.map((topic, index) => (
                  <tr key={index}>
                    <td>{topic.topic}</td>
                    <td>{topic.attempted}</td>
                    <td>{topic.correct}</td>
                    <td>{topic.attempted > 0 ? ((topic.correct / topic.attempted) * 100).toFixed(0) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="photo-section-inline">
          <div className="photo-section-title">Candidate Photographs</div>
          <PhotoCatolog searchTerm={testID} showToast={showToast} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default ScoreChart;
