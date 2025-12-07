import React from "react";
import GaugeChart from "react-gauge-chart";

const ScoreChart = ({ message }) => {
  //console.log("ScoreChart message:", message);
  if (!message) return null; // Return null if message is not provided
  const parsedBody = message;

  const { candidateName, totalQuestions, correctAnswers } = parsedBody;
  const scorePercent = correctAnswers / totalQuestions;

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
    </div>
  );
};

export default ScoreChart;
