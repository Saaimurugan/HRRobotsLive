import { useState, useEffect } from "react";
import GaugeChart from "react-gauge-chart";
import PhotoCatolog from "./photoCatolog";
import { useGlobalContext } from "../globalContext";

const ScoreChart = ({ message }) => {
  const { JWTValue } = useGlobalContext();
  const [topicScores, setTopicScores] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const parsedBody = message;
  const { testID, candidateName, templateName, submittedAt } = parsedBody || {};
  
  // Calculate totals from topic scores when available, otherwise fall back to message data
  const calculatedTotals = topicScores.length > 0 
    ? topicScores.reduce((acc, topic) => ({
        totalQuestions: acc.totalQuestions + (topic.totalQuestions || 0),
        correctAnswers: acc.correctAnswers + (topic.correct || 0),
        submittedAnswers: acc.submittedAnswers + (topic.attempted || 0),
      }), { totalQuestions: 0, correctAnswers: 0, submittedAnswers: 0 })
    : {
        totalQuestions: parsedBody?.totalQuestions || 0,
        correctAnswers: parsedBody?.correctAnswers || 0,
        submittedAnswers: parsedBody?.submittedAnswers || 0,
      };

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
        if (data.statusCode === 200) {
          const parsed = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
          setTopicScores(parsed || []);
        }
      } catch (error) {
        console.error("Error fetching topic scores:", error);
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopicScores();
  }, [testID]);

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
                  <th>No of Questions</th>
                  <th>Attempted</th>
                  <th>Correct</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {topicScores.map((topic, index) => (
                  <tr key={index}>
                    <td>{topic.topic}</td>
                    <td>{topic.totalQuestions}</td>
                    <td>{topic.attempted}</td>
                    <td>{topic.correct}</td>
                    <td>{topic.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="photo-section-inline">
          <div className="photo-section-title">Candidate Photographs</div>
          <PhotoCatolog searchTerm={testID} />
        </div>
      </div>
      </div>
    </div>
  );
};

export default ScoreChart;
