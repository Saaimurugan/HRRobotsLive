import React, { useState, useEffect, useMemo } from "react";
import "../CreateTemplate.css";
import "../createTemplateFromJD.css";
import "../RichTextEditor.css";
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useSessionHandler } from "../useSessionHandler";
import CreateTemplateFromJDModal from "./CreateTemplateFromJDModal";
import CodeEditor from './CodeEditor.js';
import RichTextEditor from './RichTextEditor.js';
import { logTemplateCreation } from '../utils/templateHistoryLogger';

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
          <svg className="toast-icon" viewBox="0 0 24 24">
            {toast.type === 'error' && <path fill="#e53e3e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>}
            {toast.type === 'success' && <path fill="#38a169" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
            {toast.type === 'warning' && <path fill="#dd6b20" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
            {toast.type === 'info' && <path fill="#3182ce" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
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

const CreateTemplate = () => {
  const [questionSet, setQuestionSet] = useState([]);
  const { globalValue, JWTValue } = useGlobalContext("");
  const [ttname, setTtname] = useState("");
  const [toasts, setToasts] = useState([]);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [showJDModal, setShowJDModal] = useState(false);
  const [isPsychometricReport, setIsPsychometricReport] = useState(false);
  const [formData, setFormData] = useState({
    type: "mcq",
    question: "",
    options: [],
    correctAnswer: "",
    correctAnswerIndex: -1,
    rangeMin: 0,
    rangeMax: 10,
    anyAnswerCorrect: false,
    question2: "", // Second question for rangeWithTwoQuestions type
  });
  const [topic, setTopic] = useState("");
  const [manualTopic, setManualTopic] = useState(""); // Topic for manual question entry
  const [level, setLevel] = useState("fresher");
  const [groupByTopic, setGroupByTopic] = useState(true);
  const [aiQuestionTypes, setAiQuestionTypes] = useState({ mcq: 20, range: 0, elaborate: 0, code: 0 }); // Question types for AI generation
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingOriginalIndex, setEditingOriginalIndex] = useState(null); // Track original index in questionSet
  const [loading, setLoading] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState(null); // null means "Total" (show all)
  const [showSamplePlaceholder, setShowSamplePlaceholder] = useState(true); // Show sample when no questions
  const navigate = useNavigate();
  const location = useLocation();

  // Sample placeholder question (frontend only - never saved)
  const SAMPLE_PLACEHOLDER = {
    type: "mcq",
    question: "This is a sample placeholder question. Add your own questions using the form on the right or generate them with AI. This sample will disappear once you add real questions.",
    topic: "Sample Topic",
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

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
  }, [globalValue, navigate]);

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

  // Helper function to strip HTML tags for validation
  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const addQuestion = () => {
    // Validate question field is not empty
    if (!formData.question || !stripHtml(formData.question).trim()) {
      showToast('warning', 'Missing Question', 'Question field cannot be empty.');
      return;
    }

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
      // Validate that all options are not empty
      const hasEmptyOption = formData.options.some(opt => !opt || !stripHtml(opt).trim());
      if (hasEmptyOption) {
        showToast('warning', 'Empty Options', 'All options must have text. Please fill in or remove empty options.');
        return;
      }
      if (formData.correctAnswerIndex < 0) {
        showToast('warning', 'No Answer Selected', 'Please select a correct answer.');
        return;
      }
      newQuestion.options = formData.options;
      newQuestion.correctAnswer = formData.options[formData.correctAnswerIndex];
      newQuestion.correctAnswerIndex = formData.correctAnswerIndex;
    } else if (formData.type === "range") {
      if (formData.rangeMin >= formData.rangeMax) {
        showToast('warning', 'Invalid Range', 'Minimum value must be less than maximum value.');
        return;
      }
      if (!formData.anyAnswerCorrect && (!formData.correctAnswer || formData.correctAnswer === '')) {
        showToast('warning', 'Missing Correct Answer', 'Please enter a correct answer or check "Any selection is a correct answer".');
        return;
      }
      newQuestion.options = "Range";
      newQuestion.rangeMin = formData.rangeMin;
      newQuestion.rangeMax = formData.rangeMax;
      newQuestion.correctAnswer = formData.anyAnswerCorrect ? "All" : formData.correctAnswer;
      newQuestion.anyAnswerCorrect = formData.anyAnswerCorrect;
    } else if (formData.type === "rangeWithTwoQuestions") {
      if (!formData.question2 || !stripHtml(formData.question2).trim()) {
        showToast('warning', 'Missing Second Question', 'Please enter the second question.');
        return;
      }
      if (formData.rangeMin >= formData.rangeMax) {
        showToast('warning', 'Invalid Range', 'Minimum value must be less than maximum value.');
        return;
      }
      newQuestion.options = "RangeWithTwoQuestions";
      newQuestion.question2 = formData.question2;
      newQuestion.rangeMin = formData.rangeMin;
      newQuestion.rangeMax = formData.rangeMax;
      newQuestion.correctAnswer = ""; // Optional for this type
      newQuestion.anyAnswerCorrect = true; // Range is controlled by checkbox
    } else if (formData.type === "elaborate" || formData.type === "code") {
      // For elaborate and code questions, correctAnswer is optional (can be empty for manual evaluation)
      newQuestion.options = "";
      newQuestion.correctAnswer = formData.correctAnswer || "";
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
    setFormData({ type: "mcq", question: "", options: [], correctAnswer: "", correctAnswerIndex: -1, rangeMin: 0, rangeMax: 10, anyAnswerCorrect: false, question2: "" });
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
    const correctIndex = questionToEdit.options && Array.isArray(questionToEdit.options) ? questionToEdit.options.indexOf(questionToEdit.correctAnswer) : -1;
    setFormData({
      type: questionToEdit.type,
      question: questionToEdit.question, // Clean question text
      options: Array.isArray(questionToEdit.options) ? questionToEdit.options : [],
      correctAnswer: questionToEdit.correctAnswer || "",
      correctAnswerIndex: correctIndex,
      rangeMin: questionToEdit.rangeMin || 0,
      rangeMax: questionToEdit.rangeMax || 10,
      anyAnswerCorrect: questionToEdit.anyAnswerCorrect || false,
      question2: questionToEdit.question2 || "",
    });
    setManualTopic(topic === '__NO_TOPIC__' ? '' : topic);
    setIsEditing(true);
    setEditingOriginalIndex(originalIndex);
  };

  const saveEditedQuestion = () => {
    const updatedQuestions = [...questionSet];
    let correctAnswer = formData.correctAnswer;
    let options = formData.options;
    
    if (formData.type === "mcq") {
      correctAnswer = formData.correctAnswerIndex >= 0 ? formData.options[formData.correctAnswerIndex] : formData.correctAnswer;
      options = formData.options;
    } else if (formData.type === "range") {
      correctAnswer = formData.anyAnswerCorrect ? "All" : formData.correctAnswer;
      options = "Range";
    } else if (formData.type === "rangeWithTwoQuestions") {
      correctAnswer = "";
      options = "RangeWithTwoQuestions";
    } else if (formData.type === "elaborate" || formData.type === "code") {
      correctAnswer = formData.correctAnswer || "";
      options = "";
    }
    
    updatedQuestions[editingOriginalIndex] = { 
      ...formData,
      topic: manualTopic || '__NO_TOPIC__',
      question: formData.question,
      correctAnswer: correctAnswer,
      correctAnswerIndex: formData.correctAnswerIndex >= 0 ? formData.correctAnswerIndex : undefined,
      options: options,
      question2: formData.type === "rangeWithTwoQuestions" ? formData.question2 : undefined,
    };
    setQuestionSet(updatedQuestions);
    clearForm();
  };

  const checkTemplateDuplicate = async (templateName) => {
    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalValue: globalValue, token: JWTValue }),
      });

      const data = await response.json();

      if (checkUnauthorized(data)) return false;

      if (data.statusCode === 200) {
        const templates = data.body || [];
        const isDuplicate = templates.some(t => t.templateName && t.templateName.toLowerCase() === templateName.toLowerCase());
        return isDuplicate;
      }
      return false;
    } catch (error) {
      //console.error('Error checking duplicate template:', error);
      return false;
    }
  };

  const saveQuestions = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!questionSet || !Array.isArray(questionSet)) {
      showToast('error', 'Error', 'Invalid question set');
      setLoading(false);
      return;
    }

    if (!ttname.trim()) {
      showToast('warning', 'Template Name Required', 'Please enter a template name.');
      setLoading(false);
      return;
    }

    if (questionSet.length === 0) {
      showToast('warning', 'No Questions', 'No questions to save. Please add some questions first.');
      setLoading(false);
      return;
    } else if (questionSet.length < 5) {
      showToast('warning', 'Not Enough Questions', `Minimum 5 questions required. You have ${questionSet.length} questions.`);
      setLoading(false);
      return;
    } else if (questionSet.length > 60) {
      showToast('warning', 'Too Many Questions', `Maximum 60 questions allowed. You have ${questionSet.length} questions.`);
      setLoading(false);
      return;
    }

    // Check for duplicate template name
    const isDuplicate = await checkTemplateDuplicate(ttname);
    if (isDuplicate) {
      showToast('error', 'Duplicate Template Name', `A template with the name "${ttname}" already exists. Please use a different name.`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions_", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateID: "", 
          templateName: ttname, 
          globalValue: globalValue, 
          questions: questionSet, 
          isPsychometricReport: isPsychometricReport,
          token: JWTValue 
        }),
      });

      const data = await response.json();

      if (checkUnauthorized(data)) return;

      if (data.statusCode === 200) {
        // Get templateID from response and create default configuration
        const templateID = data.templateID;
        
        if (templateID) {
          try {
            const configResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/setTestConfiguration", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ templateID, createDefault: true, numberOfQuestions: 10, token: JWTValue }),
            });
            const configData = await configResponse.json();
            if (configData.statusCode !== 200) {
              //console.error('Failed to create default configuration:', configData);
            }
          } catch (configError) {
            //console.error('Error creating default configuration:', configError);
          }

          // Log template creation history
          try {
            await logTemplateCreation(templateID, globalValue, globalValue);
          } catch (historyError) {
            console.error('Error logging template history:', historyError);
          }
        }
        
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
      showToast('warning', 'Topic Required', 'Please enter a topic to generate questions.');
      return;
    }

    const totalQuestions = Object.values(aiQuestionTypes).reduce((sum, val) => sum + val, 0);
    if (totalQuestions === 0) {
      showToast('warning', 'No Questions', 'Please specify at least one question to generate.');
      return;
    }
    
    if (totalQuestions > 20) {
      showToast('warning', 'Too Many Questions', 'Total questions cannot exceed 20. Please reduce the counts.');
      return;
    }

    setIsGenerating(true);
    const formattedQuestions = questionSet.map(q => q.question).join(", ");

    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createQuestionsUsingAI__", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level, formattedQuestions, questionTypes: aiQuestionTypes, token: JWTValue }),
      });

      const data = await response.json();
      if (checkUnauthorized(data)) return;
      const parsedBody = JSON.parse(data.body);
      const responseContent = parsedBody.data;
      const generatedQuestions = JSON.parse(responseContent);

      const questionsWithTopic = generatedQuestions.map(q => {
        // Calculate correctAnswerIndex from correctAnswer value for MCQ
        const correctAnswerIndex = q.options && Array.isArray(q.options) ? q.options.indexOf(q.correctAnswer) : -1;
        return {
          ...q,
          topic: topic, // Use separate topic field
          correctAnswerIndex: correctAnswerIndex >= 0 ? correctAnswerIndex : undefined
        };
      });

      // Hide sample placeholder when adding AI-generated questions
      setShowSamplePlaceholder(false);
      const updatedQuestionSet = [...questionSet, ...questionsWithTopic];
      setQuestionSet(updatedQuestionSet);
      
      // Auto-generate template name only if user hasn't entered one
      if (!ttname.trim()) {
        const allTopics = new Set();
        updatedQuestionSet.forEach(q => {
          // NEW: Use separate topic field directly
          if (q.topic && q.topic !== '__NO_TOPIC__') {
            allTopics.add(q.topic);
          }
        });
        const topicsString = Array.from(allTopics).sort().join('/');
        setTtname(topicsString + " - " + level);
      }
      
      showToast('success', 'Success', `Generated ${questionsWithTopic.length} questions successfully!`);
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
      <CreateTemplateFromJDModal 
        isOpen={showJDModal} 
        onClose={() => setShowJDModal(false)} 
        showToast={showToast}
        onQuestionsGenerated={(questions) => {
          setShowSamplePlaceholder(false);
          setQuestionSet(prev => [...prev, ...questions]);
        }}
      />
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
              <div className="topic-counts-summary">
                  <span 
                    className={`topic-count-badge ${selectedTopicFilter === null ? 'topic-count-active' : 'topic-count-inactive'}`}
                    onClick={() => setSelectedTopicFilter(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    Total: {questionSet.length}
                  </span>
                  {topicCounts && Object.entries(topicCounts).filter(([key]) => key !== '__no_topic__').sort((a, b) => a[0].localeCompare(b[0])).map(([topicName, count]) => (
                    <span 
                      key={topicName} 
                      className={`topic-count-badge ${selectedTopicFilter === topicName ? 'topic-count-active' : 'topic-count-inactive'}`}
                      onClick={() => setSelectedTopicFilter(topicName)}
                      style={{ cursor: 'pointer' }}
                    >
                      {topicName}: {count}
                    </span>
                  ))}
                  {topicCounts && topicCounts.__no_topic__ > 0 && (
                    <span 
                      className={`topic-count-badge ${selectedTopicFilter === '__no_topic__' ? 'topic-count-active' : 'topic-count-inactive'} topic-count-no-topic`}
                      onClick={() => setSelectedTopicFilter('__no_topic__')}
                      style={{ cursor: 'pointer' }}
                    >
                      No Topic: {topicCounts.__no_topic__}
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
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                {/* <input
                  type="checkbox"
                  id="psychometric-checkbox"
                  checked={isPsychometricReport}
                  onChange={(e) => setIsPsychometricReport(e.target.checked)}
                  style={{ width: 'auto', cursor: 'pointer' }}
                /> */}
                {/* <label htmlFor="psychometric-checkbox" style={{ margin: 0, cursor: 'pointer' }}>
                  Psychometric test-based report
                </label> */}
              </div>
              <button className="btn-primary" onClick={saveQuestions} disabled={loading}>
                {loading ? "Saving..." : "Save Questions"}
              </button>
            </div>

            <div className="questions-list" data-tour="question-list">
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
                        <h4>{index + 1}. <span className="rendered-html-content" dangerouslySetInnerHTML={{ __html: q.displayQuestion }} /></h4>
                        {q.type === "range" ? (
                          <div className="range-display">
                            <p><strong>Range:</strong> {q.rangeMin} to {q.rangeMax}</p>
                            <p><strong>Correct Answer:</strong> {q.anyAnswerCorrect ? "Any selection is correct" : q.correctAnswer}</p>
                          </div>
                        ) : q.type === "rangeWithTwoQuestions" ? (
                          <div className="range-display">
                            <p><strong>Type:</strong> Range with Two Questions</p>
                            <p><strong>Question 1:</strong> {q.question}</p>
                            <p><strong>Question 2:</strong> {q.question2}</p>
                            <p><strong>Range:</strong> {q.rangeMin} to {q.rangeMax}</p>
                            <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                              User will select which question to answer during the test
                            </p>
                          </div>
                        ) : q.type === "elaborate" ? (
                          <div className="elaborate-display">
                            <p><strong>Type:</strong> Elaborate Answer</p>
                            {q.correctAnswer && (
                              <div style={{ marginTop: '8px' }}>
                                <strong>Expected Answer:</strong>
                                <div className="rendered-html-content" style={{ marginTop: '4px', padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)' }} dangerouslySetInnerHTML={{ __html: q.correctAnswer }} />
                              </div>
                            )}
                          </div>
                        ) : q.type === "code" ? (
                          <div className="code-display">
                            <p><strong>Type:</strong> Code Solution</p>
                            {q.correctAnswer && (
                              <div style={{ marginTop: '8px' }}>
                                <strong>Expected Solution:</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '4px', padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                  {q.correctAnswer}
                                </pre>
                              </div>
                            )}
                          </div>
                        ) : q.options && Array.isArray(q.options) && (
                          <ul>{q.options.map((opt, i) => <li key={i} className={(q.correctAnswerIndex !== undefined ? i === q.correctAnswerIndex : opt === q.correctAnswer) ? 'correct-answer' : ''}><span className="rendered-html-content" dangerouslySetInnerHTML={{ __html: opt }} /></li>)}</ul>
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
            <div className="form-section" data-tour="add-question-form">
              <h3>{isEditing ? "Edit Question" : "Add Question"}</h3>
              <div className="form-group">
                <label>Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="mcq">MCQ</option>
                  <option value="range">Range</option>
                  <option value="rangeWithTwoQuestions">Range with Two Questions</option>
                  <option value="elaborate">Elaborate</option>
                  <option value="code">Code</option>
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
                <RichTextEditor
                  value={formData.question}
                  onChange={(content) => setFormData({ ...formData, question: content })}
                  placeholder="Enter your question here..."
                  minHeight="150px"
                />
              </div>

              {formData.type === "mcq" && (
                <div className="form-group">
                  <label>Options (select correct answer)</label>
                  {formData.options.map((opt, i) => (
                    <div key={i} className="option-item" style={{ marginBottom: '15px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={formData.correctAnswerIndex === i}
                        onChange={() => setCorrectAnswer(i)}
                        style={{ marginTop: '10px', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <RichTextEditor
                          value={opt}
                          onChange={(content) => updateOption(i, content)}
                          placeholder={`Option ${i + 1}`}
                          minHeight="80px"
                        />
                      </div>
                      <button className="btn-danger" onClick={() => removeOption(i)} title="Delete option" style={{ marginTop: '10px', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button className="btn-secondary" onClick={addOption}>+ Add Option</button>
                </div>
              )}

              {formData.type === "range" && (
                <div className="form-group">
                  <label>Range Settings</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>Minimum</label>
                      <input
                        type="number"
                        value={formData.rangeMin}
                        onChange={(e) => setFormData({ ...formData, rangeMin: Number(e.target.value) })}
                        placeholder="Min value"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>Maximum</label>
                      <input
                        type="number"
                        value={formData.rangeMax}
                        onChange={(e) => setFormData({ ...formData, rangeMax: Number(e.target.value) })}
                        placeholder="Max value"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.anyAnswerCorrect}
                        onChange={(e) => setFormData({ ...formData, anyAnswerCorrect: e.target.checked })}
                      />
                      Any selection is a correct answer
                    </label>
                  </div>

                  {!formData.anyAnswerCorrect && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>Correct Answer</label>
                      <input
                        type="number"
                        value={formData.correctAnswer}
                        onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                        placeholder="Enter correct value"
                        min={formData.rangeMin}
                        max={formData.rangeMax}
                      />
                    </div>
                  )}
                </div>
              )}

              {formData.type === "rangeWithTwoQuestions" && (
                <div className="form-group">
                  <label>Second Question</label>
                  <RichTextEditor
                    value={formData.question2}
                    onChange={(content) => setFormData({ ...formData, question2: content })}
                    placeholder="Enter the second question here..."
                    minHeight="150px"
                  />
                  
                  <label style={{ marginTop: '15px' }}>Range Settings</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>Minimum</label>
                      <input
                        type="number"
                        value={formData.rangeMin}
                        onChange={(e) => setFormData({ ...formData, rangeMin: Number(e.target.value) })}
                        placeholder="Min value"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>Maximum</label>
                      <input
                        type="number"
                        value={formData.rangeMax}
                        onChange={(e) => setFormData({ ...formData, rangeMax: Number(e.target.value) })}
                        placeholder="Max value"
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    During the test, the user will select which question to answer before using the range slider.
                  </p>
                </div>
              )}

              {formData.type === "elaborate" && (
                <div className="form-group">
                  <label>Expected Answer (Optional)</label>
                  <RichTextEditor
                    value={formData.correctAnswer}
                    onChange={(content) => setFormData({ ...formData, correctAnswer: content })}
                    placeholder="Enter the expected elaborate answer or leave empty for manual evaluation..."
                    minHeight="150px"
                  />
                  <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    This will be used as a reference answer for evaluation. Candidates will provide their own elaborate response.
                  </p>
                </div>
              )}

              {formData.type === "code" && (
                <div className="form-group">
                  <label>Expected Code Solution (Optional)</label>
                  <CodeEditor
                    value={formData.correctAnswer}
                    onChange={(code) => setFormData({ ...formData, correctAnswer: code })}
                    language="javascript"
                    placeholder="Enter the expected code solution or leave empty for manual evaluation..."
                    minHeight="200px"
                  />
                  <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    This will be used as a reference solution for evaluation. Candidates will write their own code.
                  </p>
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

            <div className="ai-section" data-tour="ai-section">
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
              <div className="form-group">
                <label>Question Types (Total: {Object.values(aiQuestionTypes).reduce((sum, val) => sum + val, 0)} / 20)</label>
                <div className="question-types-grid">
                  <div className="type-input-group">
                    <label>MCQ</label>
                    <input
                      type="number"
                      value={aiQuestionTypes.mcq}
                      onChange={(e) => {
                        const newVal = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                        setAiQuestionTypes({ ...aiQuestionTypes, mcq: newVal });
                      }}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="type-input-group">
                    <label>Range</label>
                    <input
                      type="number"
                      value={aiQuestionTypes.range}
                      onChange={(e) => {
                        const newVal = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                        setAiQuestionTypes({ ...aiQuestionTypes, range: newVal });
                      }}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="type-input-group">
                    <label>Elaborate</label>
                    <input
                      type="number"
                      value={aiQuestionTypes.elaborate}
                      onChange={(e) => {
                        const newVal = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                        setAiQuestionTypes({ ...aiQuestionTypes, elaborate: newVal });
                      }}
                      min="0"
                      max="20"
                    />
                  </div>
                  <div className="type-input-group">
                    <label>Code</label>
                    <input
                      type="number"
                      value={aiQuestionTypes.code}
                      onChange={(e) => {
                        const newVal = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                        setAiQuestionTypes({ ...aiQuestionTypes, code: newVal });
                      }}
                      min="0"
                      max="20"
                    />
                  </div>
                </div>
                {Object.values(aiQuestionTypes).reduce((sum, val) => sum + val, 0) > 20 && (
                  <p style={{ color: 'var(--color-error)', fontSize: '0.85em', marginTop: '8px' }}>
                    Total questions cannot exceed 20. Please reduce the counts.
                  </p>
                )}
              </div>
              <button 
                className="btn-primary" 
                onClick={generateQuestions} 
                disabled={isGenerating || Object.values(aiQuestionTypes).reduce((sum, val) => sum + val, 0) === 0 || Object.values(aiQuestionTypes).reduce((sum, val) => sum + val, 0) > 20}
              >
                {isGenerating ? "Generating..." : `Generate ${Object.values(aiQuestionTypes).reduce((sum, val) => sum + val, 0)} Questions`}
              </button>
              <p>Adjust question types above. Change topic to mix questions from different areas.</p>
            </div>

            <div className="ai-section" data-tour="jd-template-section">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Template from JD
              </h3>
              <p style={{ marginBottom: '15px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                Upload a Job Description to automatically extract keywords and generate relevant MCQ questions.
              </p>
              <button className="btn-primary" onClick={() => setShowJDModal(true)}>
                Create from Job Description
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTemplate;
