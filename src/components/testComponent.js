import React, { useState, useEffect } from "react";
import "../testComponent.css";
import SubmittedMessage from "./submittedMessage.js";
import DisplayMessage from "./displayMessage.js";
/* import { useRouter } from "next/router";
 */
/* import { useNavigate } from "react-router-dom"; */

const TestComponent = ({ testID, userID, candidateName }) => {
  const [answers, setAnswers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [savedQuestions, setSavedQuestions] = useState([]);

  /* const router = useRouter();
 */
/*   const navigate = useNavigate();
 */  const handlePreventDefault = (event) => {
    event.preventDefault();
    alert("Action disabled!");
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

  useEffect(() => {
    // Fetch the first question when the component loads
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    try {
      //console.log("Fetching question for testID:", testID, "and candidateName:", candidateName);
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testID, candidateName }),
        }
      );
      const data = await response.json();
      //console.log("Fetch question response:", data);
      if (data.statusCode === 200) {
        const question = JSON.parse(data.body).question;
        setQuestions((prevQuestions) => [...prevQuestions, question]);
        if (questionCount===0)
        {
          setQuestionCount(JSON.parse(data.body).question_count);
        }
      }
      else if (data.statusCode === 404) {
        setMessage(data.body);
        console.error(data.body);
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
    setIsLoadingNext(true);
    const currentQuestion = questions[currentQuestionIndex];

    // Save the answer locally
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);

    // Call API to save the answer
    try {
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveAnswerSubmitted",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            questionID: currentQuestion.questionID,
            answer,
          }),
        }
      );
      const data = await response.json();
      if (data.statusCode === 200)
      {
        setSavedQuestions((prevQuestionIDs) => [...prevQuestionIDs, currentQuestion.questionID]);
      }

      if (data.statusCode !== 200) {
        setMessage("Failed to save answer: " + data.statusCode + "-" + data.body);
        console.error("Failed to save answer", data);
      }
    } catch (error) {
      setMessage("Failed to save answer: " + error.message);
      console.error("Error saving answer:", error);
    }
    finally {
      setIsLoadingNext(false);
    }
  };

  const handleNext = async () => {
    setIsLoadingNext(true);
    //check whether setSavedQuestionCount has the currentQuestion.questionID
    //console.log("savedQuestions: ", savedQuestions);
    //console.log("currentQuestion.questionID: ", currentQuestion.questionID);
    if (savedQuestions.includes(currentQuestion.questionID)) {}else{
      //console.log("Saving answer for question: ", currentQuestion.questionID);
      saveAnswer("");
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      await fetchQuestion();
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
    // Save the answer for the current question before moving to the next one
    setIsLoadingNext(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
/*       const correctAnswers = answers.reduce((total, answer, index) => {
        return answer === questions[index].correctAnswer ? total + 1 : total;
      }, 0);
 */
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({testID}),
        }
      );
      const data = await response.json();
      if (data.statusCode === 200) {
        setMessage("Test submitted successfully!");
        setIsSubmitted(true);
        //alert("Test submitted successfully!");
      } else {
        setMessage("Failed to submit test, please take screenshot and contact support.");
        //console.error("Failed to submit test", data);
      }
    } catch (error) {
      setMessage("Error submitting test.");
      console.error("Error submitting test:", error);
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <>
    {!isSubmitted?
    <div className="MCQOuterWrap">
      {currentQuestion ?
      <>
      {(currentQuestionIndex + questionCount) <= 50? 
        <div>{/* {currentQuestionIndex} - {questionCount} -  */}
          <h2>Question {questionCount === 1 
                        ? currentQuestionIndex + 1 
                        : questionCount === 0 
                          ? currentQuestionIndex + 1
                          : currentQuestionIndex + questionCount}
          /50</h2>
          <p>{currentQuestion.question}</p>
          <ul className="MCQUL">
            {currentQuestion.options.map((option, index) => (
              <li key={index} style={{ margin: "10px 0", listStyle: "none" }}>
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="options"
                  value={option}
                  checked={answers[currentQuestionIndex] === option}
                  onChange={() => saveAnswer(option)}
                  style={{ verticalAlign: "top", marginLeft: "-40px"}} // Align the input with the label text
                />
                &ensp;
                <label 
                htmlFor={`option-${index}`}
                style={{
                  display: "inline-block",
                  marginLeft: "0px", // Adjust for the indent
                  textIndent: "0px", // Hanging indent
                  lineHeight: "1.5",
                  verticalAlign: "top",
                  marginTop: "-2px",
                }}
              >
                {option}
              </label>
              </li>
            ))}
          </ul>
          <div>
            <button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              style={{ backgroundColor: "#6c757d" }}
            >
              Previous
            </button>
            {(currentQuestionIndex + questionCount) >= 50 ? (
              <button
                onClick={handleSubmit}
                style={{ backgroundColor: "#007bff" }}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isLoadingNext}
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
        <DisplayMessage message={message}/>:<p className="loading">Loading question</p>}
       </>
      }
      </div>
    :
    <SubmittedMessage />
  }</>
  );
};

export default TestComponent;
