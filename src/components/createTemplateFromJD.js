import React, { useState, useEffect, useCallback } from "react";
import * as pdfjsLib from 'pdfjs-dist';
import "../CreateTemplate.css";
import "../createTemplateFromJD.css";
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

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

const CreateTemplateFromJD = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentKeyword: "" });
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [toasts, setToasts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const { globalValue, JWTValue, setRedirectPath, logout } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Toast functions
  const showToast = useCallback((type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };


  // Session handler
  const checkUnauthorized = useCallback((data) => {
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      setRedirectPath(location.pathname);
      showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
      logout();
      setTimeout(() => navigate('/login'), 1500);
      return true;
    }
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized") {
          setRedirectPath(location.pathname);
          showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
          logout();
          setTimeout(() => navigate('/login'), 1500);
          return true;
        }
      } catch (e) {}
    }
    return false;
  }, [location.pathname, logout, navigate, setRedirectPath, showToast]);

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
  }, [globalValue, navigate]);

  // PDF text extraction
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const extractedText = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText.push(pageText);
    }
    return extractedText.join(' ');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setJdFile(file);
      try {
        const text = await extractTextFromPDF(file);
        setJdText(text);
      } catch (error) {
        showToast('error', 'Error', 'Failed to extract text from PDF.');
      }
    } else if (file) {
      showToast('error', 'Invalid File', 'Please upload a valid PDF file.');
    }
  };

  const handleTextChange = (e) => {
    setJdText(e.target.value);
  };

  // Extract keywords from JD
  const extractKeywords = async () => {
    if (!jdText.trim()) {
      showToast('warning', 'No Content', 'Please upload a JD or paste the text.');
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/extractKeywordsFromJD", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText, token: JWTValue })
      });
      const data = await response.json();
      
      if (checkUnauthorized(data)) {
        setIsExtracting(false);
        return;
      }

      const parsedBody = JSON.parse(data.body);
      const extractedKeywords = parsedBody.keywords || [];
      
      // Initialize keywords with default question count
      const keywordsWithCount = extractedKeywords.map(kw => ({
        keyword: kw.keyword || kw,
        questionCount: kw.suggestedCount || 5,
        selected: true
      }));
      
      setKeywords(keywordsWithCount);
      setCurrentStep(2);
    } catch (error) {
      showToast('error', 'Error', 'Failed to extract keywords from JD.');
    } finally {
      setIsExtracting(false);
    }
  };


  // Toggle keyword selection
  const toggleKeyword = (index) => {
    setKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, selected: !kw.selected } : kw
    ));
  };

  // Update question count for a keyword
  const updateQuestionCount = (index, count) => {
    const newCount = Math.max(1, Math.min(20, parseInt(count) || 1));
    setKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, questionCount: newCount } : kw
    ));
  };

  // Get total questions count
  const getTotalQuestions = () => {
    return keywords.filter(kw => kw.selected).reduce((sum, kw) => sum + kw.questionCount, 0);
  };

  // Generate questions for selected keywords
  const generateQuestions = async () => {
    const selectedKeywords = keywords.filter(kw => kw.selected);
    
    if (selectedKeywords.length === 0) {
      showToast('warning', 'No Keywords', 'Please select at least one keyword.');
      return;
    }

    if (!templateName.trim()) {
      showToast('warning', 'Template Name Required', 'Please enter a template name.');
      return;
    }

    setIsGenerating(true);
    setGeneratedQuestions([]);
    setCurrentStep(3);

    const allQuestions = [];
    
    for (let i = 0; i < selectedKeywords.length; i++) {
      const kw = selectedKeywords[i];
      setGenerationProgress({
        current: i + 1,
        total: selectedKeywords.length,
        currentKeyword: kw.keyword
      });

      try {
        // Generate questions in batches of 20 (API limit)
        let questionsForKeyword = [];
        let remaining = kw.questionCount;
        
        while (remaining > 0) {
          const batchSize = Math.min(20, remaining);
          const existingQuestions = [...allQuestions, ...questionsForKeyword].map(q => q.question).join(", ");
          
          const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/createQuestionsUsingAI", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              topic: kw.keyword, 
              level: "fresher", 
              formattedQuestions: existingQuestions,
              questionCount: batchSize,
              token: JWTValue 
            })
          });

          const data = await response.json();
          if (checkUnauthorized(data)) {
            setIsGenerating(false);
            return;
          }

          const parsedBody = JSON.parse(data.body);
          const responseContent = parsedBody.data;
          const generatedBatch = JSON.parse(responseContent);

          const questionsWithTopic = generatedBatch.slice(0, batchSize).map(q => ({
            type: "mcq",
            topic: kw.keyword,  // NEW: Use separate topic field
            question: q.question,  // Clean question text without topic prefix
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            correctAnswerIndex: q.options ? q.options.indexOf(q.correctAnswer) : -1
          }));

          questionsForKeyword = [...questionsForKeyword, ...questionsWithTopic];
          remaining -= batchSize;
        }

        allQuestions.push(...questionsForKeyword.slice(0, kw.questionCount));
        setGeneratedQuestions([...allQuestions]);
        
      } catch (error) {
        showToast('error', 'Error', `Failed to generate questions for "${kw.keyword}".`);
      }
    }

    setIsGenerating(false);
    showToast('success', 'Complete', `Generated ${allQuestions.length} questions successfully!`);
  };


  // Save template
  const saveTemplate = async () => {
    if (generatedQuestions.length < 10) {
      showToast('warning', 'Not Enough Questions', `Minimum 10 questions required. You have ${generatedQuestions.length} questions.`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateID: "", 
          templateName: templateName, 
          globalValue: globalValue, 
          questions: generatedQuestions, 
          token: JWTValue 
        }),
      });

      const data = await response.json();
      if (checkUnauthorized(data)) {
        setIsSaving(false);
        return;
      }

      if (data.statusCode === 200) {
        const templateID = data.templateID;
        
        if (templateID) {
          try {
            await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/setTestConfiguration", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ templateID, createDefault: true, numberOfQuestions: 10, token: JWTValue }),
            });
          } catch (configError) {
            // Silent fail for config
          }
        }
        
        showToast('success', 'Success', 'Template saved successfully!');
        setTimeout(() => navigate("/list"), 2000);
      } else {
        showToast('error', 'Error', data.message || 'Failed to save template');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a question
  const deleteQuestion = (index) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // REMOVED: Topic parsing functions are no longer needed
  // Frontend now handles topics as separate entities throughout

  // Render Step 1: Upload JD
  const renderStep1 = () => (
    <div className="jd-step-content">
      <div className="upload-section-jd">
        <div className={`upload-card-jd ${jdFile ? 'has-file' : ''}`}>
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3>Upload Job Description</h3>
          <p>Upload a PDF file or paste the JD text below</p>
          <div className="file-input-wrapper">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              id="jd-upload"
            />
            <label htmlFor="jd-upload" className="file-input-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose PDF File
            </label>
          </div>
          {jdFile && (
            <div className="file-name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {jdFile.name}
            </div>
          )}
        </div>
      </div>

      <div className="jd-text-section">
        <label>Or paste Job Description text:</label>
        <textarea
          value={jdText}
          onChange={handleTextChange}
          placeholder="Paste the job description content here..."
          rows={12}
        />
      </div>

      <div className="step-actions">
        <button 
          className="btn-primary" 
          onClick={extractKeywords} 
          disabled={isExtracting || !jdText.trim()}
        >
          {isExtracting ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Extracting Keywords...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Extract Keywords
            </>
          )}
        </button>
      </div>
    </div>
  );


  // Render Step 2: Select Keywords
  const renderStep2 = () => (
    <div className="jd-step-content">
      <div className="template-name-section">
        <label>Template Name:</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Enter template name..."
        />
      </div>

      <div className="keywords-section">
        <div className="keywords-header">
          <h3>Select Keywords & Question Count</h3>
          <div className="total-questions">
            Total Questions: <span>{getTotalQuestions()}</span>
          </div>
        </div>
        
        <div className="keywords-list">
          {keywords.map((kw, index) => (
            <div key={index} className={`keyword-item ${kw.selected ? 'selected' : ''}`}>
              <label className="keyword-checkbox">
                <input
                  type="checkbox"
                  checked={kw.selected}
                  onChange={() => toggleKeyword(index)}
                />
                <span className="keyword-name">{kw.keyword}</span>
              </label>
              <div className="question-count-input">
                <button 
                  className="count-btn"
                  onClick={() => updateQuestionCount(index, kw.questionCount - 1)}
                  disabled={!kw.selected}
                >-</button>
                <input
                  type="number"
                  value={kw.questionCount}
                  onChange={(e) => updateQuestionCount(index, e.target.value)}
                  min="1"
                  max="20"
                  disabled={!kw.selected}
                />
                <button 
                  className="count-btn"
                  onClick={() => updateQuestionCount(index, kw.questionCount + 1)}
                  disabled={!kw.selected}
                >+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button 
          className="btn-primary" 
          onClick={generateQuestions}
          disabled={!templateName.trim() || getTotalQuestions() === 0}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Generate Questions ({getTotalQuestions()})
        </button>
      </div>
    </div>
  );

  // Render Step 3: Generate & Review Questions
  const renderStep3 = () => (
    <div className="jd-step-content">
      {isGenerating && (
        <div className="generation-progress">
          <div className="progress-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span>Generating questions for: <strong>{generationProgress.currentKeyword}</strong></span>
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Keyword {generationProgress.current} of {generationProgress.total}
          </div>
        </div>
      )}

      <div className="generated-questions-section">
        <div className="questions-header">
          <h3>Generated Questions ({generatedQuestions.length})</h3>
          {!isGenerating && generatedQuestions.length >= 10 && (
            <button className="btn-primary" onClick={saveTemplate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Template
                </>
              )}
            </button>
          )}
        </div>

        <div className="questions-list">
          {generatedQuestions.map((q, index) => {
            // NEW: Use separate topic field directly
            const topic = q.topic || '__NO_TOPIC__';
            return (
              <div key={index} className="qcard">
                {topic && topic !== '__NO_TOPIC__' && <span className="question-topic-tag">{topic}</span>}
                <h4>{index + 1}. {q.question}</h4>
                <ul>
                  {q.options.map((opt, optIndex) => (
                    <li key={optIndex} className={optIndex === q.correctAnswerIndex ? 'correct-answer' : ''}>
                      {opt}
                    </li>
                  ))}
                </ul>
                <div className="qcard-actions">
                  <button className="btn-danger" onClick={() => deleteQuestion(index)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isGenerating && (
        <div className="step-actions">
          <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Keywords
          </button>
        </div>
      )}
    </div>
  );


  return (
    <div className="create-template-page">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="create-template-container jd-template-container">
        <div className="template-header">
          <button onClick={() => navigate(-1)} className="template-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Create Template from Job Description</h1>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Upload JD</div>
          </div>
          <div className="step-connector" />
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Select Keywords</div>
          </div>
          <div className="step-connector" />
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Generate Questions</div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default CreateTemplateFromJD;
