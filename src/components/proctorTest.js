import React, { useState, useEffect } from "react";

const TestPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);

  useEffect(() => {
    fetchQuestion(currentQuestionIndex);
  }, [currentQuestionIndex]);

  const fetchQuestion = async (index) => {
    try {
      const response = await fetch(
        "https://<lambda-endpoint>/dev",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "get_question",
            userID: "user123",
            questionIndex: index,
          }),
        }
      );
      const data = await response.json();
      setCurrentQuestion(data.body.question);
    } catch (error) {
      //console.error("Error fetching question:", error);
    }
  };

  const handleAnswer = async (answer) => {
    setUserAnswers((prev) => [...prev, answer]);

    try {
      await fetch("https://<lambda-endpoint>/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "save_answer",
          userID: "user123",
          questionID: currentQuestion.questionID,
          answer: answer,
        }),
      });
    } catch (error) {
      //console.error("Error saving answer:", error);
    }

    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
  };

  return (
    <div>
      {currentQuestion ? (
        <div>
          <h2>{currentQuestion.question}</h2>
          <ul>
            {currentQuestion.options.map((option, index) => (
              <li key={index}>
                <button onClick={() => handleAnswer(option)}>{option}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Loading question...</p>
      )}
    </div>
  );
};

export default TestPage;
