import React, { useState, useEffect } from "react";
import "../CreateTemplate.css";
import { useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";

// Toast Component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
          <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {toast.type === 'error' && <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>}
            {toast.type === 'success' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
            {toast.type === 'warning' && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
            {toast.type === 'info' && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

const CreateTemplate = () => {
  const [questionSet, setQuestionSet] = useState([]);
  const { globalValue } = useGlobalContext("");
  const [ttname, setTtname] = useState("");
  const [toasts, setToasts] = useState([]);
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
  const navigate = useNavigate();

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
  }, [globalValue, navigate]);

  // Toast functions
  const showToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

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
    setMessage("");
    const selectedAnswer = formData.options[index];
    setFormData({ ...formData, correctAnswer: selectedAnswer });
  };

  const removeOption = (index) => {
    setMessage("");
    const newOptions = [...formData.options];
    newOptions.splice(index, 1);
    setFormData({ ...formData, options: newOptions });
  };

  const addQuestion = () => {
    setMessage("");
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
    setMessage("");
  };

  const removeQuestion = (index) => {
    setMessage("");
    const updatedQuestions = questionSet.filter((_, i) => i !== index);
    setQuestionSet(updatedQuestions);
  };

  const editQuestion = (index) => {
    setMessage("");
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
    setMessage("");
    const updatedQuestions = [...questionSet];
    updatedQuestions[editingIndex] = { ...formData };
    setQuestionSet(updatedQuestions);
    clearForm();
  };

  const saveQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!questionSet || !Array.isArray(questionSet)) {
      showToast('error', 'Error', 'Invalid question set');
      setLoading(false);
      return;
    }

    if (questionSet.length === 0) {
      showToast('warning', 'No Questions', 'No questions to save. Please add some questions first.');
      setLoading(false);
      return;
    } else if (questionSet.length < 50) {
      showToast('warning', 'Not Enough Questions', `Minimum 50 questions required. You have ${questionSet.length} questions.`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateID: "", templateName: ttname, globalValue: globalValue, questions: questionSet }),
      });

      const data = await response.json();

      if (data.statusCode === 200) {
        clearForm();
        showToast('success', 'Success', 'Questions saved successfully!');
        setTimeout(() => navigate("/list"), 2000);
      } else {
        showToast('error', 'Error', data.message || 'Failed to save questions');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred. Please try again later.');
    } finally {
      setLoading(false);
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
      const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/createQuestionsUsingAI", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, formattedQuestions }),
      });

      const data = await response.json();
      const parsedBody = JSON.parse(data.body);
      const responseContent = parsedBody.data;
      const generatedQuestions = JSON.parse(responseContent);

      const questionsWithTopic = generatedQuestions.map(q => ({
        ...q,
        question: `${topic}::: ${q.question}`
      }));

      setQuestionSet([...questionSet, ...questionsWithTopic]);
      setTtname(topic + " - " + level);
    } catch (error) {
      console.error(error);
      alert("Error generating questions. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="create-template-page">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="create-template-container">
        <div className="template-header">
          <button onClick={() => navigate(-1)} className="template-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Create Test Template</h1>
        </div>

        <div className="template-content">
          <div className="left-panel">
            <div className="form-section">
              <h3>Questions ({questionSet.length})</h3>
              <div className="form-group">
                <label>Test Template Name</label>
                <input
                  type="text"
                  placeholder="Enter the test template name"
                  value={ttname}
                  onChange={(e) => setTtname(e.target.value)}
                  required
                />
              </div>
              <button className="btn-primary" onClick={saveQuestions} disabled={loading}>
                {loading ? "Saving..." : "Save Questions"}
              </button>
            </div>

            <div className="questions-list">
              {questionSet.length > 0 ? (
                questionSet.map((q, index) => (
                  <div key={index} className="qcard">
                    <h4>{index + 1}. {q.question}</h4>
                    {q.options && (
                      <ul>{q.options.map((opt, i) => <li key={i}>{opt}</li>)}</ul>
                    )}
                    <p><strong>Answer:</strong> {q.correctAnswer}</p>
                    <div className="qcard-actions">
                      <button className="btn-edit" onClick={(e) => { e.preventDefault(); editQuestion(index); }}>Edit</button>
                      <button className="btn-danger" onClick={(e) => { e.preventDefault(); removeQuestion(index); }}>Remove</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No questions added yet. Use the form to add questions or generate with AI.</p>
                </div>
              )}
            </div>
          </div>

          <div className="right-panel">
            <div className="form-section">
              <h3>{isEditing ? "Edit Question" : "Add Question"}</h3>
              <div className="form-group">
                <label>Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="mcq">MCQ</option>
                </select>
              </div>

              <div className="form-group">
                <label>Question</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Enter your question here..."
                />
              </div>

              {formData.type === "mcq" && (
                <div className="form-group">
                  <label>Options (select correct answer)</label>
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
                        placeholder={`Option ${i + 1}`}
                      />
                      <button className="btn-danger" onClick={() => removeOption(i)}>×</button>
                    </div>
                  ))}
                  <button className="btn-secondary" onClick={addOption}>+ Add Option</button>
                </div>
              )}

              {isEditing ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button className="btn-primary" onClick={saveEditedQuestion}>Save Changes</button>
                  <button className="btn-secondary" onClick={clearForm}>Cancel</button>
                </div>
              ) : (
                <button className="btn-primary" onClick={addQuestion} style={{ marginTop: '15px' }}>Add Question</button>
              )}
            </div>

            <div className="ai-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" />
                  <circle cx="7.5" cy="14.5" r="1.5" />
                  <circle cx="16.5" cy="14.5" r="1.5" />
                </svg>
                Generate with AI
              </h3>
              <div className="form-group">
                <label>Topic</label>
                <input
                  type="text"
                  placeholder="e.g., JavaScript, React, Python"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Difficulty Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="fresher">Fresher</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advance">Advanced</option>
                  <option value="Super Advanced/very complex">Super Advanced</option>
                </select>
              </div>
              <button className="btn-primary" onClick={generateQuestions} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate 20 Questions"}
              </button>
              <p>Each click generates 20 new questions. Change topic to mix questions from different areas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTemplate;
