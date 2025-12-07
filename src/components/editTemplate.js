import React, { useState, useEffect } from "react";
import "../CreateTemplate.css";
import { GlobalProvider, useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";

const EditTemplate = () => {
  const [questionSet, setQuestionSet] = useState([]);
  const { globalValue, setGlobalValue } = useGlobalContext("");
  const [ttname, setTtname] = useState("");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    type: "mcq",
    question: "",
    options: [],
    correctAnswer: "",
  });
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("fresher");
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);														  
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(false);  
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const navigate = useNavigate();

  const url = window.location.href; // Get the full URL
  const parts = url.split('/'); // Split the URL by '/'
  const passedTemplateID = parts[parts.length - 1]; // Get the last part of the URL

  useEffect(() => {
    if (!globalValue) {
      navigate("/login");
    } else {
      loadQuestions(passedTemplateID);
    }
  }, [globalValue, navigate, passedTemplateID]); // Ensure dependencies are listed
  
  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""],
    });
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const setCorrectAnswer = (index) => {
    const selectedAnswer = formData.options[index];
    setFormData({ ...formData, correctAnswer: selectedAnswer });
  };

  const removeOption = (index) => {
    const newOptions = [...formData.options];
    newOptions.splice(index, 1);
    setFormData({ ...formData, options: newOptions });
  };

  const addQuestion = () => {
    const newQuestion = { type: formData.type, question: formData.question };

    if (formData.type === "mcq") {
      if (!formData.options.length) {
        alert("MCQ must have at least one option.");
        return;
      }
      if (!formData.correctAnswer) {
        alert("Please select a correct answer.");
        return;
      }									
      newQuestion.options = formData.options;
      newQuestion.correctAnswer = formData.correctAnswer;
    } else {
      if (!formData.correctAnswer) {
        alert("Answer cannot be empty for a descriptive question.");
        return;
      }
      newQuestion.correctAnswer = formData.correctAnswer;
    }

    setQuestionSet([...questionSet, newQuestion]);
    clearForm();
  };

  const clearForm = () => {
    setFormData({ type: "mcq", question: "", options: [], correctAnswer: "" });
    setIsEditing(false);
    setEditingIndex(null);
  };

  const removeQuestion = (index) => {
    const updatedQuestions = questionSet.filter((_, i) => i !== index);
    setQuestionSet(updatedQuestions);
  };

  const editQuestion = (index) => {
    const questionToEdit = questionSet[index];
    setFormData({
      type: questionToEdit.type,
      question: questionToEdit.question,
      options: questionToEdit.options || [],
      correctAnswer: questionToEdit.correctAnswer || "",
    });
    setIsEditing(true);
    setEditingIndex(index);
  };

  const saveEditedQuestion = () => {
    const updatedQuestions = [...questionSet];
    updatedQuestions[editingIndex] = { ...formData };
    setQuestionSet(updatedQuestions);
    clearForm();
  };
  
  const saveQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!questionSet || !Array.isArray(questionSet)) {
      setMessage("Invalid question set");
      setLoading(false);
      return;
    }
  
    if (questionSet.length === 0) {
        setMessage("No questions to save.");
        setLoading(false);
        return;
    } else if (questionSet.length < 50) { 
        setMessage("Minimum 50 questions required to save.");
        setLoading(false);
        return;
    }

    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions", {
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({ templateID: passedTemplateID, templateName: ttname, globalValue: globalValue, questions: questionSet}),
      });

      const data = await response.json();

      if (data.statusCode === 200) {
          setMessage(data.message);
      } else {
          setMessage(data.message);
      }
    } catch (error) {
        setMessage("An error occurred. Please try again later.");
    } finally {
        setLoading(false);
        navigate("/list");
    }

  }

  const autoFixJSON = (fileContent) => {
    try {
        // Remove Markdown backticks (```json or ```)
        fileContent = fileContent.replace(/```(json)?/g, '').trim();

        // Attempt to parse the JSON to check validity
        const jsonData = JSON.parse(fileContent);

        // If parsing succeeds, write the cleaned JSON back to the file
        const prettyJSON = JSON.stringify(jsonData, null, 4);
        //console.log('JSON file fixed and saved successfully.');
        return prettyJSON
    } catch (error) {
        console.error('Error auto-fixing JSON:', error.message);
    }
  }

  const loadQuestions = async (passedTemplateID) => {
    try {
      setLoadingTemplate(true);
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ passedTemplateID }),
        }
      );
  
      const data = await response.json();
  
      if (data.statusCode === 200) {
        try {
          // Parse the JSON string in `body`
          const parsedBody = JSON.parse(data.body);
  
          if (Array.isArray(parsedBody.questions)) {
            setQuestionSet(parsedBody.questions); // Correctly setting questions
            setTtname(parsedBody.templateName);
          } else {
            console.error("Invalid questions format in response:", parsedBody);
          }
        } catch (parseError) {
          console.error("Error parsing response body:", parseError);
        }
      } else {
        console.error("Unexpected API response:", data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoadingTemplate(false);
    }
  };
  
  const generateQuestions = async () => {
    if (!topic) {
      alert("Please enter a topic to generate questions.");
      return;
    }

    setIsGenerating(true);
    const formattedQuestions = questionSet.map(q => q.question).join(", ");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer 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`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
						messages: [
								{
									role: 'system',
									content: 'You are a helpful assistant that generates educational questions in JSON format.'
								},
								{
									role: 'user',
									content: `Generate 25 MCQ with answers related to the topic: 
									"${topic}". 
									
									Level: ${level}
									
									Don't generate the questions below:
									${formattedQuestions}
									
									Use the following JSON format:\n\n[
										{
											"type": "mcq",
											"question": "<Question>",
											"options": [
												"<option1>",
												"<option2>",
												"<option3>",
												"<option4>"
											],
											"correctAnswer": "<Correct option>"
										}
									]`
								}
							],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      //console.log(autoFixJSON(data.choices[0].message.content));
      autoFixJSON(data.choices[0].message.content)
      const generatedQuestions = JSON.parse(autoFixJSON(data.choices[0].message.content));

      //Iterate the questionSet and Check if the question is repeated, if yes then remove the repeated question
      let uniqueQuestions = []; 
      let repeatedQuestions = [];
      generatedQuestions.forEach((q) => {
          if (!uniqueQuestions.includes(q.question)) {
              uniqueQuestions.push(q.question);
          } else {
              repeatedQuestions.push(q.question);
          }
      });

      setQuestionSet([...questionSet, ...generatedQuestions]);
      if (!ttname){
      setTtname(topic + " - " + level);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating questions. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };										 
  return (
    <div className="container" style={{ marginTop: "70px" }}>
      {loadingTemplate ? 
      <p className="loading">Loading...</p>
      :
      <>
         <div className="left-panel">
         <form>
            <h3>Questions</h3>
            <div className="form-group">
               <label>Test Template Name</label>
               <input
               type="text"
               id="ttname"
               name="ttname"
               placeholder="Enter the test template name"
               value={ttname}
               onChange={(e) => setTtname(e.target.value)}
               required
               />
            </div>
            <button onClick={saveQuestions} disabled={loading}>{loading ? "Loading..." : "Save Questions"}</button>
            <br/>
            {message&&<p>{message}</p>}				 
            <div className="questions">
            {questionSet.length > 0 ? (
                questionSet.map((q, index) => (
                  <div key={index} className="qcard">
                    <h4>{index + 1}. {q.question}</h4>
                    {q.options && (
                      <ul>{q.options.map((opt, i) => <li key={i}>{opt}</li>)}</ul>
                    )}
                    <p><strong>Answer:</strong> {q.correctAnswer}</p>
                    <button onClick={(e) => { e.preventDefault(); removeQuestion(index); }}>Remove</button>
                    <button onClick={(e) => { e.preventDefault(); editQuestion(index); }}>Edit</button>
                  </div>
                ))
              ) : (
                <p>No questions added yet.</p>
              )}
            </div>
         </form>
         </div>
         <div className="right-panel">
         <h3>{isEditing ? "Edit Question" : "Add Question"}</h3>
         <div>
            <label>Type</label>
            <select
               value={formData.type}
               onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
               <option value="mcq">MCQ</option>
               {/* <option value="descriptive">Descriptive</option> */}
            </select>
         </div>

         <div>
            <label>Question</label>
            <textarea
               value={formData.question}
               onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            ></textarea>
         </div>

{/*          {formData.type === "mcq" && (
 */}            <div>
               <label>Options</label>
               {formData.options.map((opt, i) => (
               <div key={i} className="option-item">
                  <input
                     type="radio"
                     name="correctAnswer"
                     checked={formData.correctAnswer === opt}
                     onChange={() => setCorrectAnswer(i)}
                  />
                  <input
                     type="text"
                     value={opt}
                     onChange={(e) => updateOption(i, e.target.value)}
                  />
                  <button onClick={() => removeOption(i)}>Remove</button>
               </div>
               ))}
               <br />
               <button onClick={addOption}>Add Option</button>
            </div>
{/*          )}
 */}         <br/>
         {isEditing ? (
            <>
               <button onClick={saveEditedQuestion}>Save Changes</button>
               <button onClick={clearForm} style={{marginTop:"10pt"}}>Cancel</button>
            </>
         ) : (
                  
            <button onClick={addQuestion}>Add Question</button>
         )}

         <h3>Generate Questions using AI</h3>
         <div>
            <input
               type="text"
               placeholder="Topic"
               value={topic}
               onChange={(e) => setTopic(e.target.value)}
            />
         </div>	
         <div>
            <label>Level</label>
            <select
               value={level}
               onChange={(e) => setLevel(e.target.value)}
            >
               <option value="fresher">Fresher</option>
               <option value="intermediate">Intermediate</option>
               <option value="advance">Advanced</option>
               <option value="Super Advanced/very complex">Super Advanced</option>
            </select>
         </div>
         <button onClick={generateQuestions} disabled={isGenerating}>
               {isGenerating ? "Generating..." : "Generate Questions"}
         </button>
         <p>Note: The newly generated questions will be added to the existing ones.</p>
         </div>
      </>
      }
    </div>
  );
};

export default EditTemplate;
