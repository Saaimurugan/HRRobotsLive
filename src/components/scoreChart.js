import React, { useState, useEffect } from "react";
import GaugeChart from "react-gauge-chart";

const ScoreChart = ({ message }) => {
  const [topicScores, setTopicScores] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const parsedBody = message;
  const { totalQuestions, correctAnswers, testID } = parsedBody || {};
  const scorePercent = totalQuestions ? correctAnswers / totalQuestions : 0;

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
          body: JSON.stringify({ testID }),
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
    <div className="w-full max-w-md mx-auto text-center p-6">
      <GaugeChart
        id="score-gauge"
        nrOfLevels={30}
        colors={["#FF5F6D", "#FFC371", "#4CAF50"]}
        arcWidth={0.3}
        percent={scorePercent}
        textColor="#000000"
        needleColor="#333"
        needleBaseColor="#333"
        animate={true}
      />
      <p className="mt-4 text-lg">
        Score: {correctAnswers} / {totalQuestions} ({(scorePercent * 100).toFixed(1)}%)
      </p>

      {/* Topic Score Table */}
      <div style={{ marginTop: "20px" }}>
        {loadingTopics ? (
          <p>Loading topic scores...</p>
        ) : topicScores.length > 0 ? (
          <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#a6c2f3", color: "#222121" }}>
                <th style={{ padding: "10px", border: "1px solid #ddd" }}>Topic</th>
                <th style={{ padding: "10px", border: "1px solid #ddd" }}>No of Questions</th>
                <th style={{ padding: "10px", border: "1px solid #ddd" }}>Attempted</th>
                <th style={{ padding: "10px", border: "1px solid #ddd" }}>Correct</th>
                <th style={{ padding: "10px", border: "1px solid #ddd" }}>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {topicScores.map((topic, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? "#a6c2f3" : "#a6c2f3" }}>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>{topic.topic}</td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>{topic.totalQuestions}</td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>{topic.attempted}</td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>{topic.correct}</td>
                  <td style={{ padding: "10px", border: "1px solid #ddd" }}>{topic.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <br/>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ScoreChart;
