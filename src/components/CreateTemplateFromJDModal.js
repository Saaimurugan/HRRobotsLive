import { useState, useCallback } from "react";
import * as pdfjsLib from 'pdfjs-dist';
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const CreateTemplateFromJDModal = ({ isOpen, onClose, showToast, onQuestionsGenerated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentKeyword: "" });
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const { JWTValue, setRedirectPath, logout } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Reset modal state
  const resetModal = () => {
    setCurrentStep(1);
    setJdFile(null);
    setJdText("");
    setKeywords([]);
    setGeneratedQuestions([]);
    setIsExtracting(false);
    setIsGenerating(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Load questions to createTemplate page
  const handleUseQuestions = () => {
    if (generatedQuestions.length > 0) {
      onQuestionsGenerated(generatedQuestions);
      showToast('success', 'Questions Loaded', `${generatedQuestions.length} questions added to your template. Don't forget to save!`);
      resetModal();
      onClose();
    }
  };


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

  const toggleKeyword = (index) => {
    setKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, selected: !kw.selected } : kw
    ));
  };

  const updateQuestionCount = (index, count) => {
    const newCount = Math.max(1, Math.min(20, parseInt(count) || 1));
    setKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, questionCount: newCount } : kw
    ));
  };

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
            question: `${kw.keyword}::: ${q.question}`,
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

  const deleteQuestion = (index) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const parseQuestionTopic = (questionText) => {
    if (questionText && questionText.includes(':::')) {
      const [topic, ...rest] = questionText.split(':::');
      return { topic: topic.trim(), question: rest.join(':::').trim() };
    }
    return { topic: '', question: questionText };
  };

  if (!isOpen) return null;


  return (
    <div className="jd-modal-overlay" onClick={handleClose}>
      <div className="jd-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="jd-modal-header">
          <h2>Create Template from Job Description</h2>
          <button className="jd-modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
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

        <div className="jd-modal-body">
          {/* Step 1: Upload JD */}
          {currentStep === 1 && (
            <div className="jd-step-content">
              <div className="jd-input-row">
                <div className="upload-section-jd">
                  <div className={`upload-card-jd ${jdFile ? 'has-file' : ''}`}>
                    <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <h3>Upload PDF</h3>
                    <p>Upload a Job Description PDF file</p>
                    <div className="file-input-wrapper">
                      <input type="file" accept="application/pdf" onChange={handleFileChange} id="jd-upload-modal" />
                      <label htmlFor="jd-upload-modal" className="file-input-label">
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

                <div className="jd-divider">
                  <span>OR</span>
                </div>

                <div className="jd-text-section">
                  <label>Paste Job Description text:</label>
                  <textarea value={jdText} onChange={handleTextChange} placeholder="Paste the job description content here..." rows={8} />
                </div>
              </div>

              <div className="step-actions">
                <button className="btn-primary" onClick={extractKeywords} disabled={isExtracting || !jdText.trim()}>
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
          )}


          {/* Step 2: Select Keywords */}
          {currentStep === 2 && (
            <div className="jd-step-content">
              <div className="keywords-section">
                <div className="keywords-header">
                  <h3>Select Keywords & Question Count</h3>
                  <div className="total-questions">Total Questions: <span>{getTotalQuestions()}</span></div>
                </div>
                
                <div className="keywords-list">
                  {keywords.map((kw, index) => (
                    <div key={index} className={`keyword-item ${kw.selected ? 'selected' : ''}`}>
                      <label className="keyword-checkbox">
                        <input type="checkbox" checked={kw.selected} onChange={() => toggleKeyword(index)} />
                        <span className="keyword-name">{kw.keyword}</span>
                      </label>
                      <div className="question-count-input">
                        <button className="count-btn" onClick={() => updateQuestionCount(index, kw.questionCount - 1)} disabled={!kw.selected}>-</button>
                        <input type="number" value={kw.questionCount} onChange={(e) => updateQuestionCount(index, e.target.value)} min="1" max="20" disabled={!kw.selected} />
                        <button className="count-btn" onClick={() => updateQuestionCount(index, kw.questionCount + 1)} disabled={!kw.selected}>+</button>
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
                <button className="btn-primary" onClick={generateQuestions} disabled={getTotalQuestions() === 0}>
                  Generate Questions ({getTotalQuestions()})
                </button>
              </div>
            </div>
          )}


          {/* Step 3: Generate & Review Questions */}
          {currentStep === 3 && (
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
                    <div className="progress-bar" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }} />
                  </div>
                  <div className="progress-text">Keyword {generationProgress.current} of {generationProgress.total}</div>
                </div>
              )}

              <div className="generated-questions-section">
                <div className="questions-header">
                  <h3>Generated Questions ({generatedQuestions.length})</h3>
                  {!isGenerating && generatedQuestions.length > 0 && (
                    <button className="btn-primary" onClick={handleUseQuestions}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Use These Questions
                    </button>
                  )}
                </div>

                <div className="questions-list-modal">
                  {generatedQuestions.map((q, index) => {
                    const { topic, question } = parseQuestionTopic(q.question);
                    return (
                      <div key={index} className="qcard">
                        {topic && <span className="question-topic-tag">{topic}</span>}
                        <h4>{index + 1}. {question}</h4>
                        <ul>
                          {q.options.map((opt, optIndex) => (
                            <li key={optIndex} className={optIndex === q.correctAnswerIndex ? 'correct-answer' : ''}>{opt}</li>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTemplateFromJDModal;
