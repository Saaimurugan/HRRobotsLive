import React, { useState, useEffect, useMemo } from "react";
import "../CreateTemplate.css";
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useSessionHandler } from "../useSessionHandler";

// REMOVED: Topic parsing functions are no longer needed
// Frontend now handles topics as separate entities throughout

// Topic Combobox Component
const TopicCombobox = ({ value, onChange, existingTopics, placeholder = "Select or type a topic" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const filteredTopics = existingTopics.filter(topic =>
    topic.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSelectTopic = (topic) => {
    setInputValue(topic);
    onChange(topic);
    setIsOpen(false);
  };

  return (
    <div className="topic-combobox">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        className="topic-combobox-input"
      />
      {isOpen && filteredTopics.length > 0 && (
        <ul className="topic-combobox-dropdown">
          {filteredTopics.map((topic, index) => (
            <li
              key={index}
              onClick={() => handleSelectTopic(topic)}
              className="topic-combobox-option"
            >
              {topic}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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

// Mobile Warning Modal Component
const MobileWarningModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="mobile-warning-overlay">
      <div className="mobile-warning-modal">
        <svg className="mobile-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p>For the best experience, please use a larger screen when editing or creating templates. These actions are not supported on mobile devices.</p>
        <button className="btn-primary" onClick={onClose}>OK</button>
      </div>
    </div>
  );
};

const EditTemplate = () => {
  const [questionSet, setQuestionSet] = useState([]);
  const { globalValue, JWTValue } = useGlobalContext("");
  const [ttname, setTtname] = useState("");
  const [toasts, setToasts] = useState([]);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [formData, setFormData] = useState({
    type: "mcq",
    question: "",
    options: [],
    correctAnswer: "",
    correctAnswerIndex: -1,
  });
  const [topic, setTopic] = useState("");
  const [manualTopic, setManualTopic] = useState(""); // Topic for manual question entry
  const [level, setLevel] = useState("fresher");
  const [groupByTopic, setGroupByTopic] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingOriginalIndex, setEditingOriginalIndex] = useState(null); // Track original index in questionSet
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState(null); // null means "Total" (show all)
  const [minQuestions, setMinQuestions] = useState(10); // Default minimum, will be updated from config
  const [showSamplePlaceholder, setShowSamplePlaceholder] = useState(false); // Show sample when no questions
  const navigate = useNavigate();
  const location = useLocation();

  // Sample placeholder question (frontend only - never saved)
  const SAMPLE_PLACEHOLDER = {
    type: "mcq",
    topic: "Sample Topic",
    question: "This is a sample placeholder question. Add your own questions using the form on the right or generate them with AI. This sample will disappear once you add real questions.",
    options: ["Option A (example)", "Option B (example)", "Option C (example)", "Option D (example)"],
    correctAnswer: "Option A (example)",
    correctAnswerIndex: 0,
    isSampleQuestion: true
  };

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

  // Session handler for unauthorized responses
  const { checkUnauthorized } = useSessionHandler(showToast);

  // Extract unique topics from questions - UPDATED to use separate topic field
  const existingTopics = useMemo(() => {
    const topics = new Set();
    questionSet.forEach(q => {
      // NEW: Use separate topic field directly
      if (q.topic && q.topic !== '__NO_TOPIC__') {
        topics.add(q.topic);
      }
    });
    return Array.from(topics).sort();
  }, [questionSet]);

  // Group and sort questions by topic - UPDATED to use separate topic field
  const groupedQuestions = useMemo(() => {
    // If no questions, show sample placeholder
    if (questionSet.length === 0 && showSamplePlaceholder) {
      return [{
        ...SAMPLE_PLACEHOLDER,
        originalIndex: 0,
        displayQuestion: SAMPLE_PLACEHOLDER.question,
        topic: SAMPLE_PLACEHOLDER.topic || '__NO_TOPIC__'
      }];
    }

    const groups = {};
    const noTopicQuestions = [];

    questionSet.forEach((q, originalIndex) => {
      // NEW: Use separate topic field directly
      const topic = q.topic || '__NO_TOPIC__';
      const questionWithMeta = { ...q, originalIndex, displayQuestion: q.question, topic };
      
      if (topic && topic !== '__NO_TOPIC__') {
        if (!groups[topic]) groups[topic] = [];
        groups[topic].push(questionWithMeta);
      } else {
        noTopicQuestions.push(questionWithMeta);
      }
    });

    // Sort topics alphabetically and build ordered list
    const sortedTopics = Object.keys(groups).sort();
    let result = [];
    
    // Apply filter if a topic is selected
    if (selectedTopicFilter === null) {
      // Show all questions
      sortedTopics.forEach(topic => {
        result.push(...groups[topic]);
      });
      result.push(...noTopicQuestions);
    } else if (selectedTopicFilter === '__no_topic__') {
      // Show only questions without topic
      result = noTopicQuestions;
    } else {
      // Show only questions from selected topic
      result = groups[selectedTopicFilter] || [];
    }
    
    return result;
  }, [questionSet, selectedTopicFilter, showSamplePlaceholder]);

  // Calculate topic counts for display - UPDATED to use separate topic field
  const topicCounts = useMemo(() => {
    const counts = {};
    let noTopicCount = 0;
    
    questionSet.forEach(q => {
      // NEW: Use separate topic field directly
      const topic = q.topic || '__NO_TOPIC__';
      
      if (topic && topic !== '__NO_TOPIC__') {
        counts[topic] = (counts[topic] || 0) + 1;
      } else {
        noTopicCount++;
      }
    });
    
    return { ...counts, __no_topic__: noTopicCount };
  }, [questionSet]);

  // Check for mobile screen on mount
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth <= 900) {
        setShowMobileWarning(true);
      }
    };
    checkMobile();
  }, []);

  const url = window.location.href;
  const parts = url.split('/');
  const passedTemplateID = parts[parts.length - 1];

  useEffect(() => {
    if (!globalValue) {
      navigate("/login");
    } else {
      loadQuestions(passedTemplateID);
    }
  }, [globalValue, navigate, passedTemplateID]);

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
    setFormData({ ...formData, correctAnswerIndex: index });
  };

  const removeOption = (index) => {
    const newOptions = [...formData.options];
    newOptions.splice(index, 1);
    let newCorrectIndex = formData.correctAnswerIndex;
    if (index === formData.correctAnswerIndex) {
      newCorrectIndex = -1; // Reset if the correct answer was removed
    } else if (index < formData.correctAnswerIndex) {
      newCorrectIndex = formData.correctAnswerIndex - 1; // Adjust index
    }
    setFormData({ ...formData, options: newOptions, correctAnswerIndex: newCorrectIndex });
  };

  const addQuestion = () => {
    // NEW: Use separate topic field instead of embedding in question text
    const newQuestion = { 
      type: formData.type, 
      topic: manualTopic || '__NO_TOPIC__',  // NEW: Separate topic field
      question: formData.question  // Clean question text without topic prefix
    };

    if (formData.type === "mcq") {
      if (!formData.options.length) {
        showToast('warning', 'Missing Options', 'MCQ must have at least one option.');
        return;
      }
      if (formData.correctAnswerIndex < 0) {
        showToast('warning', 'No Answer Selected', 'Please select a correct answer.');
        return;
      }
      newQuestion.options = formData.options;
      newQuestion.correctAnswer = formData.options[formData.correctAnswerIndex];
      newQuestion.correctAnswerIndex = formData.correctAnswerIndex;
    } else {
      if (!formData.correctAnswer) {
        showToast('warning', 'Missing Answer', 'Answer cannot be empty for a descriptive question.');
        return;
      }
      newQuestion.correctAnswer = formData.correctAnswer;
    }

    // Hide sample placeholder when user adds their own question
    setShowSamplePlaceholder(false);
    setQuestionSet([...questionSet, newQuestion]);
    clearForm();
  };

  const clearForm = () => {
    setFormData({ type: "mcq", question: "", options: [], correctAnswer: "", correctAnswerIndex: -1 });
    setManualTopic("");
    setIsEditing(false);
    setEditingOriginalIndex(null);
  };

  const removeQuestion = (originalIndex) => {
    const updatedQuestions = questionSet.filter((_, i) => i !== originalIndex);
    setQuestionSet(updatedQuestions);
  };

  const editQuestion = (originalIndex) => {
    const questionToEdit = questionSet[originalIndex];
    // NEW: Use separate topic field directly
    const topic = questionToEdit.topic || '__NO_TOPIC__';
    const correctIndex = questionToEdit.options ? questionToEdit.options.indexOf(questionToEdit.correctAnswer) : -1;
    setFormData({
      type: questionToEdit.type,
      question: questionToEdit.question, // Clean question text
      options: questionToEdit.options || [],
      correctAnswer: questionToEdit.correctAnswer || "",
      correctAnswerIndex: correctIndex,
    });
    setManualTopic(topic === '__NO_TOPIC__' ? '' : topic);
    setIsEditing(true);
    setEditingOriginalIndex(originalIndex);
  };

  const saveEditedQuestion = () => {
    const updatedQuestions = [...questionSet];
    const correctAnswer = formData.correctAnswerIndex >= 0 ? formData.options[formData.correctAnswerIndex] : formData.correctAnswer;
    updatedQuestions[editingOriginalIndex] = { 
      ...formData,
      topic: manualTopic || '__NO_TOPIC__',  // NEW: Separate topic field
      question: formData.question,  // Clean question text without topic prefix
      correctAnswer: correctAnswer,
      correctAnswerIndex: formData.correctAnswerIndex >= 0 ? formData.correctAnswerIndex : undefined,
    };
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
    } else if (questionSet.length < minQuestions) {
      showToast('warning', 'Not Enough Questions', `Minimum ${minQuestions} questions required. You have ${questionSet.length} questions.`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions_", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateID: passedTemplateID, templateName: ttname, globalValue: globalValue, questions: questionSet, token: JWTValue }),
      });

      const data = await response.json();

      if (checkUnauthorized(data)) return;

      if (data.statusCode === 200) {
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

  const loadQuestions = async (passedTemplateID) => {
    try {
      setLoadingTemplate(true);
      
      // Fetch questions
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passedTemplateID, token: JWTValue }),
      });

      const data = await response.json();

      if (checkUnauthorized(data)) return;

      if (data.statusCode === 200) {
        try {
          const parsedBody = JSON.parse(data.body);
          if (Array.isArray(parsedBody.questions)) {
            setQuestionSet(parsedBody.questions);
            setTtname(parsedBody.templateName);
            // Show sample placeholder if no questions exist
            setShowSamplePlaceholder(parsedBody.questions.length === 0);
          } else {
            setShowSamplePlaceholder(true);
          }
        } catch (parseError) {
          setShowSamplePlaceholder(true);
        }
      } else {
        setShowSamplePlaceholder(true);
      }

      // Fetch configuration to get numberOfQuestions
      try {
        const configResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateID: passedTemplateID, token: JWTValue }),
        });
        const configData = await configResponse.json();
        if (configData.statusCode === 200 && configData.body) {
          const body = JSON.parse(configData.body);
          const config = Array.isArray(body.configurations) && body.configurations.length > 0
            ? body.configurations[0]
            : {};
          const configuredQuestions = Number(config.numberOfQuestions) || 10;
          setMinQuestions(configuredQuestions);
        }
      } catch (configError) {
        //console.error("Error fetching configuration:", configError);
      }
    } catch (error) {
      //console.error("Error fetching templates:", error);
      setShowSamplePlaceholder(true);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const generateQuestions = async () => {
    if (!topic) {
      showToast('warning', 'Topic Required', 'Please enter a topic to generate questions.');
      return;
    }

    setIsGenerating(true);
    const formattedQuestions = questionSet.map(q => q.question).join(", ");

    try {
      const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/createQuestionsUsingAI_", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, formattedQuestions, token: JWTValue }),
      });

      const data = await response.json();
      if (checkUnauthorized(data)) return;
      const parsedBody = JSON.parse(data.body);
      const responseContent = parsedBody.data;
      const generatedQuestions = JSON.parse(responseContent);

      const questionsWithTopic = generatedQuestions.map(q => {
        // Calculate correctAnswerIndex from correctAnswer value
        const correctAnswerIndex = q.options ? q.options.indexOf(q.correctAnswer) : -1;
        return {
          ...q,
          question: q.question,  // Clean question text without topic
          correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : undefined
        };
      });

      // Hide sample placeholder when adding AI-generated questions
      setShowSamplePlaceholder(false);
      setQuestionSet([...questionSet, ...questionsWithTopic]);
      if (!ttname) {
        setTtname(topic + " - " + level);
      }
    } catch (error) {
      //console.error(error);
      showToast('error', 'Generation Failed', 'Error generating questions. Please try again later.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="create-template-page">
      <MobileWarningModal isOpen={showMobileWarning} onClose={() => setShowMobileWarning(false)} />
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="create-template-container">
        <div className="template-header">
          <button onClick={() => navigate(-1)} className="template-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Edit Test Template</h1>
        </div>

        {loadingTemplate ? (
          <div className="empty-state">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <p>Loading template...</p>
          </div>
        ) : (
          <div className="template-content">
            <div className="left-panel">
              <div className="form-section">
                <div className="topic-counts-summary">
                  <span 
                    className={`topic-count-badge ${selectedTopicFilter === null ? 'topic-count-active' : 'topic-count-inactive'}`}
                    onClick={() => setSelectedTopicFilter(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    Total: {questionSet.length}
                  </span>
                  {Object.entries(topicCounts.counts).sort((a, b) => a[0].localeCompare(b[0])).map(([topicName, count]) => (
                    <span 
                      key={topicName} 
                      className={`topic-count-badge ${selectedTopicFilter === topicName ? 'topic-count-active' : 'topic-count-inactive'}`}
                      onClick={() => setSelectedTopicFilter(topicName)}
                      style={{ cursor: 'pointer' }}
                    >
                      {topicName}: {count}
                    </span>
                  ))}
                  {topicCounts.noTopicCount > 0 && (
                    <span 
                      className={`topic-count-badge ${selectedTopicFilter === '__no_topic__' ? 'topic-count-active' : 'topic-count-inactive'} topic-count-no-topic`}
                      onClick={() => setSelectedTopicFilter('__no_topic__')}
                      style={{ cursor: 'pointer' }}
                    >
                      No Topic: {topicCounts.noTopicCount}
                    </span>
                  )}
                </div>
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
                {groupedQuestions.length > 0 ? (
                  groupedQuestions.map((q, index) => {
                    const prevQuestion = index > 0 ? groupedQuestions[index - 1] : null;
                    const showTopicHeader = q.topic && (!prevQuestion || prevQuestion.topic !== q.topic);
                    const isSample = q.isSampleQuestion;
                    
                    return (
                      <React.Fragment key={isSample ? 'sample' : q.originalIndex}>
                        {showTopicHeader && (
                          <div className="topic-group-header">
                            <span className="topic-tag">{q.topic}</span>
                          </div>
                        )}
                        <div className={`qcard ${isSample ? 'sample-question-card' : ''}`}>
                          {isSample && <span className="sample-question-badge">Sample - Will be replaced when you add questions</span>}
                          {q.topic && !isSample && <span className="question-topic-tag">{q.topic}</span>}
                          <h4>{index + 1}. {q.displayQuestion}</h4>
                          {q.options && (
                            <ul>{q.options.map((opt, i) => <li key={i} className={(q.correctAnswerIndex !== undefined ? i === q.correctAnswerIndex : opt === q.correctAnswer) ? 'correct-answer' : ''}>{opt}</li>)}</ul>
                          )}
                          <div className="qcard-actions">
                            <button className="btn-edit" onClick={(e) => { e.preventDefault(); if (!isSample) editQuestion(q.originalIndex); }} disabled={isSample}>Edit</button>
                            <button className="btn-danger" onClick={(e) => { e.preventDefault(); if (!isSample) removeQuestion(q.originalIndex); }} disabled={isSample}>Remove</button>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
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
                  <label>Topic</label>
                  <TopicCombobox
                    value={manualTopic}
                    onChange={setManualTopic}
                    existingTopics={existingTopics}
                    placeholder="Select or type a topic"
                  />
                </div>

                <div className="form-group">
                  <label>Question</label>
                  <textarea
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Enter your question here..."
                  />
                </div>

                <div className="form-group">
                  <label>Options (select correct answer)</label>
                  {formData.options.map((opt, i) => (
                    <div key={i} className="option-item">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={formData.correctAnswerIndex === i}
                        onChange={() => setCorrectAnswer(i)}
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                      />
                      <button className="btn-danger" onClick={() => removeOption(i)} title="Delete option">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button className="btn-secondary" onClick={addOption}>+ Add Option</button>
                </div>

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
                  <TopicCombobox
                    value={topic}
                    onChange={setTopic}
                    existingTopics={existingTopics}
                    placeholder="e.g., JavaScript, React, Python"
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={groupByTopic}
                      onChange={(e) => setGroupByTopic(e.target.checked)}
                    />
                    Group questions by Topic
                  </label>
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
                <p>New questions will be added to the existing ones. Change topic to mix questions from different areas.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditTemplate;
