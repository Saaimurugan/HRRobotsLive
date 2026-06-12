import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalContext } from "../globalContext";
import '../agenticHR.css';

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

const AgenticHR = () => {
   const navigate = useNavigate();
   const location = useLocation();
   const { globalValue, JWTValue, setRedirectPath, logout } = useGlobalContext();
   const [toasts, setToasts] = useState([]);
   const [view, setView] = useState('main'); // main, create, jobList, candidateList
   const [jobDescription, setJobDescription] = useState('');
   const [jobTitle, setJobTitle] = useState('');
   const [loading, setLoading] = useState(false);
   const [agenticJobs, setAgenticJobs] = useState([]);
   const [selectedJob, setSelectedJob] = useState(null);
   const [candidates, setCandidates] = useState([]);
   const [topCandidates, setTopCandidates] = useState([]);
   const [pdfFile, setPdfFile] = useState(null);
   const [pdfUploading, setPdfUploading] = useState(false);
   const [inputMethod, setInputMethod] = useState('text'); // 'text' or 'pdf'

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
      } else {
         loadAgenticJobs();
      }
   }, [globalValue, navigate]);

   const loadAgenticJobs = async () => {
      try {
         const response = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/agenticHR/listJobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: globalValue, token: JWTValue }),
         });
         const data = await response.json();
         if (checkUnauthorized(data)) return;
         
         const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
         setAgenticJobs(parsedBody.jobs || []);
      } catch (error) {
         console.error('Error loading jobs:', error);
      }
   };

   const handleSubmitJob = async (e) => {
      e.preventDefault();
      if (!jobTitle.trim() || (!jobDescription.trim() && !pdfFile)) {
         showToast('error', 'Missing Information', 'Please provide both job title and description (text or PDF).');
         return;
      }

      setLoading(true);
      try {
         let finalJobDescription = jobDescription;

         // If PDF file is uploaded, extract text first
         if (pdfFile && inputMethod === 'pdf') {
            setPdfUploading(true);
            finalJobDescription = await extractTextFromPDF(pdfFile);
            setPdfUploading(false);

            if (!finalJobDescription) {
               showToast('error', 'PDF Error', 'Failed to extract text from PDF. Please try again or paste text manually.');
               setLoading(false);
               return;
            }
         }

         // Step 1: Submit JD and start agentic process
         const response = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/agenticHR/submitJob', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               email: globalValue,
               token: JWTValue,
               jobTitle,
               jobDescription: finalJobDescription,
            }),
         });

         const data = await response.json();
         if (checkUnauthorized(data)) {
            setLoading(false);
            return;
         }

         const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
         
         if (data.statusCode === 200) {
            showToast('success', 'Job Submitted', 'Agentic HR process has been initiated. Profiles will be collected and processed.');
            setJobTitle('');
            setJobDescription('');
            setPdfFile(null);
            setInputMethod('text');
            setView('main');
            loadAgenticJobs();
         } else {
            showToast('error', 'Submission Failed', parsedBody.message || 'Failed to submit job.');
         }
      } catch (error) {
         showToast('error', 'Error', 'An error occurred while submitting the job.');
      } finally {
         setLoading(false);
      }
   };

   const extractTextFromPDF = async (file) => {
      try {
         // Use PDF.js library to extract text from PDF
         const pdfjsLib = window['pdfjs-dist/build/pdf'];
         
         if (!pdfjsLib) {
            // Fallback: Upload to S3 and use Lambda for extraction
            return await extractPDFViaLambda(file);
         }

         const arrayBuffer = await file.arrayBuffer();
         const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
         
         let fullText = '';
         for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
         }
         
         return fullText.trim();
      } catch (error) {
         console.error('PDF extraction error:', error);
         // Fallback to Lambda-based extraction
         return await extractPDFViaLambda(file);
      }
   };

   const extractPDFViaLambda = async (file) => {
      try {
         // Convert file to base64
         const base64 = await fileToBase64(file);
         
         // Call Lambda function for PDF extraction
         const response = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/extractPDF', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               email: globalValue,
               token: JWTValue,
               fileContent: base64,
               fileName: file.name
            }),
         });

         const data = await response.json();
         const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
         
         if (data.statusCode === 200 && parsedBody.text) {
            return parsedBody.text;
         }
         
         return null;
      } catch (error) {
         console.error('Lambda PDF extraction error:', error);
         return null;
      }
   };

   const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = () => resolve(reader.result.split(',')[1]);
         reader.onerror = error => reject(error);
      });
   };

   const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
         if (file.type !== 'application/pdf') {
            showToast('error', 'Invalid File', 'Please upload a PDF file.');
            return;
         }
         if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showToast('error', 'File Too Large', 'Please upload a PDF file smaller than 10MB.');
            return;
         }
         setPdfFile(file);
         setJobDescription(''); // Clear text input when PDF is uploaded
      }
   };

   const removeFile = () => {
      setPdfFile(null);
   };

   const loadJobDetails = async (job) => {
      setSelectedJob(job);
      setLoading(true);
      try {
         const response = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/agenticHR/getJobDetails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               email: globalValue,
               token: JWTValue,
               jobId: job.jobId,
            }),
         });

         const data = await response.json();
         if (checkUnauthorized(data)) {
            setLoading(false);
            return;
         }

         const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
         setCandidates(parsedBody.candidates || []);
         setTopCandidates(parsedBody.topCandidates || []);
         setView('candidateList');
      } catch (error) {
         showToast('error', 'Error', 'Failed to load job details.');
      } finally {
         setLoading(false);
      }
   };

   const getStatusBadge = (status) => {
      const statusConfig = {
         collecting: { color: '#3b82f6', text: 'Collecting Profiles' },
         profiling: { color: '#f59e0b', text: 'Profiling Candidates' },
         testing: { color: '#8b5cf6', text: 'Generating Tests' },
         inviting: { color: '#06b6d4', text: 'Sending Invites' },
         following_up: { color: '#ec4899', text: 'Following Up' },
         completed: { color: '#10b981', text: 'Completed' },
         failed: { color: '#ef4444', text: 'Failed' }
      };
      const config = statusConfig[status] || { color: '#6b7280', text: status };
      return (
         <span className="status-badge" style={{ backgroundColor: config.color }}>
            {config.text}
         </span>
      );
   };

   const getProgressPercentage = (status) => {
      const progressMap = {
         collecting: 20,
         profiling: 40,
         testing: 60,
         inviting: 80,
         following_up: 90,
         completed: 100,
         failed: 0
      };
      return progressMap[status] || 0;
   };

   const renderMainView = () => (
      <div className="agentic-main">
         <div className="agentic-header">
            <button
               onClick={() => navigate(-1)}
               className="modern-button--outline"
               title="Back"
            >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
               </svg>
            </button>
            <h1>Agentic HR</h1>
            <button className="submit-btn" onClick={() => setView('create')}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
               </svg>
               New Job
            </button>
         </div>

         <div className="info-card">
            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <circle cx="12" cy="12" r="10" />
               <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div>
               <h3>Automated End-to-End Hiring</h3>
               <p>Agentic HR automatically collects profiles from LinkedIn, Naukri, Monster, and other job portals, profiles candidates against your JD, generates custom tests, sends invitations, follows up with reminders, and presents you with the top 25 qualified candidates.</p>
            </div>
         </div>

         {agenticJobs.length === 0 ? (
            <div className="empty-state">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <h3>No Active Jobs</h3>
               <p>Start by submitting a job description to begin the agentic hiring process.</p>
               <button className="submit-btn" onClick={() => setView('create')}>
                  Create First Job
               </button>
            </div>
         ) : (
            <div className="jobs-grid">
               {agenticJobs.map((job) => (
                  <div key={job.jobId} className="job-card" onClick={() => loadJobDetails(job)}>
                     <div className="job-card-header">
                        <h3>{job.jobTitle}</h3>
                        {getStatusBadge(job.status)}
                     </div>
                     <p className="job-description">{job.jobDescription.substring(0, 150)}...</p>
                     <div className="job-stats">
                        <div className="stat">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                           </svg>
                           <span>{job.candidatesCount || 0} Candidates</span>
                        </div>
                        <div className="stat">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 11l3 3L22 4" />
                              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                           </svg>
                           <span>{job.testsCompleted || 0} Tests</span>
                        </div>
                     </div>
                     <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${getProgressPercentage(job.status)}%` }}></div>
                     </div>
                     <div className="job-footer">
                        <span className="timestamp">Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
   );

   const renderCreateView = () => (
      <div className="agentic-create">
         <div className="agentic-header">
            <button
               onClick={() => setView('main')}
               className="modern-button--outline"
               title="Back"
            >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
               </svg>
            </button>
            <h1>Submit Job for Agentic HR</h1>
         </div>

         <form className="agentic-form" onSubmit={handleSubmitJob}>
            <div className="form-group">
               <label>Job Title *</label>
               <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  required
               />
            </div>

            <div className="form-group">
               <label>Job Description Input Method *</label>
               <div className="input-method-selector">
                  <button
                     type="button"
                     className={`method-btn ${inputMethod === 'text' ? 'active' : ''}`}
                     onClick={() => {
                        setInputMethod('text');
                        setPdfFile(null);
                     }}
                  >
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                     </svg>
                     Paste Text
                  </button>
                  <button
                     type="button"
                     className={`method-btn ${inputMethod === 'pdf' ? 'active' : ''}`}
                     onClick={() => {
                        setInputMethod('pdf');
                        setJobDescription('');
                     }}
                  >
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                     </svg>
                     Upload PDF
                  </button>
               </div>
            </div>

            {inputMethod === 'text' ? (
               <div className="form-group">
                  <label>Job Description *</label>
                  <textarea
                     value={jobDescription}
                     onChange={(e) => setJobDescription(e.target.value)}
                     placeholder="Paste or enter the complete job description..."
                     rows="15"
                     required={inputMethod === 'text'}
                  />
               </div>
            ) : (
               <div className="form-group">
                  <label>Upload Job Description PDF *</label>
                  <div className="file-upload-area">
                     {!pdfFile ? (
                        <label className="file-upload-label">
                           <input
                              type="file"
                              accept=".pdf"
                              onChange={handleFileChange}
                              style={{ display: 'none' }}
                           />
                           <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                           </svg>
                           <p className="upload-text">
                              <strong>Click to upload</strong> or drag and drop
                           </p>
                           <p className="upload-hint">PDF file up to 10MB</p>
                        </label>
                     ) : (
                        <div className="file-uploaded">
                           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                           </svg>
                           <div className="file-info">
                              <strong>{pdfFile.name}</strong>
                              <span>{(pdfFile.size / 1024).toFixed(2)} KB</span>
                           </div>
                           <button
                              type="button"
                              className="remove-file-btn"
                              onClick={removeFile}
                              title="Remove file"
                           >
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                 <line x1="18" y1="6" x2="6" y2="18" />
                                 <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            )}

            <div className="form-group">
               <p className="help-text">
                  The AI will use this job description to:
                  <ul>
                     <li>Search and collect relevant profiles from job portals</li>
                     <li>Profile and rank candidates based on skill match</li>
                     <li>Generate custom assessment tests</li>
                     <li>Send test invitations and follow-ups automatically</li>
                  </ul>
               </p>
            </div>

            <div className="form-actions">
               <button type="button" className="cancel-btn" onClick={() => setView('main')}>
                  Cancel
               </button>
               <button type="submit" className="submit-btn" disabled={loading || pdfUploading}>
                  {loading || pdfUploading ? (
                     <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                           <path d="M21 12a9 9 0 11-6.219-8.56" />
                        </svg>
                        {pdfUploading ? 'Processing PDF...' : 'Submitting...'}
                     </>
                  ) : (
                     <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                           <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                        Start Agentic Process
                     </>
                  )}
               </button>
            </div>
         </form>
      </div>
   );

   const renderCandidateList = () => (
      <div className="candidate-list">
         <div className="agentic-header">
            <button
               onClick={() => setView('main')}
               className="modern-button--outline"
               title="Back"
            >
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
               </svg>
            </button>
            <h1>{selectedJob?.jobTitle}</h1>
            {getStatusBadge(selectedJob?.status)}
         </div>

         {loading ? (
            <div className="loading-state">
               <svg className="spinner-large" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
               </svg>
               <p>Loading candidates...</p>
            </div>
         ) : (
            <>
               {topCandidates.length > 0 && (
                  <div className="top-candidates-section">
                     <h2>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Top 25 Candidates
                     </h2>
                     <div className="candidates-table">
                        <table>
                           <thead>
                              <tr>
                                 <th>Rank</th>
                                 <th>Name</th>
                                 <th>Match Score</th>
                                 <th>Test Status</th>
                                 <th>Test Score</th>
                                 <th>Source</th>
                                 <th>Actions</th>
                              </tr>
                           </thead>
                           <tbody>
                              {topCandidates.map((candidate, index) => (
                                 <tr key={candidate.candidateId}>
                                    <td>
                                       <div className="rank-badge">#{index + 1}</div>
                                    </td>
                                    <td>
                                       <div className="candidate-info">
                                          <strong>{candidate.name}</strong>
                                          <span className="candidate-email">{candidate.email}</span>
                                       </div>
                                    </td>
                                    <td>
                                       <div className="score-bar">
                                          <div className="score-fill" style={{ width: `${candidate.matchScore}%` }}></div>
                                          <span>{candidate.matchScore}%</span>
                                       </div>
                                    </td>
                                    <td>
                                       <span className={`test-status ${candidate.testStatus}`}>
                                          {candidate.testStatus === 'completed' ? 'Completed' :
                                           candidate.testStatus === 'invited' ? 'Invited' :
                                           candidate.testStatus === 'reminded' ? 'Reminded' : 'Pending'}
                                       </span>
                                    </td>
                                    <td>
                                       {candidate.testScore !== null ? (
                                          <strong>{candidate.testScore}%</strong>
                                       ) : (
                                          <span className="text-muted">-</span>
                                       )}
                                    </td>
                                    <td>
                                       <span className="source-badge">{candidate.source}</span>
                                    </td>
                                    <td>
                                       <button
                                          className="view-btn"
                                          onClick={() => window.open(candidate.profileUrl, '_blank')}
                                          title="View Profile"
                                       >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                             <circle cx="12" cy="12" r="3" />
                                          </svg>
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {candidates.length > 0 && (
                  <div className="all-candidates-section">
                     <h2>All Candidates ({candidates.length})</h2>
                     <div className="candidates-grid">
                        {candidates.map((candidate) => (
                           <div key={candidate.candidateId} className="candidate-card">
                              <div className="candidate-header">
                                 <h3>{candidate.name}</h3>
                                 <span className={`test-status ${candidate.testStatus}`}>
                                    {candidate.testStatus}
                                 </span>
                              </div>
                              <p className="candidate-email">{candidate.email}</p>
                              <div className="candidate-meta">
                                 <span>Match: {candidate.matchScore}%</span>
                                 <span>Source: {candidate.source}</span>
                              </div>
                              {candidate.testScore !== null && (
                                 <div className="test-score">Test Score: {candidate.testScore}%</div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {candidates.length === 0 && topCandidates.length === 0 && (
                  <div className="empty-state">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                     </svg>
                     <h3>No Candidates Yet</h3>
                     <p>The system is collecting profiles. Check back shortly.</p>
                  </div>
               )}
            </>
         )}
      </div>
   );

   return (
      <div className="agentic-hr-page">
         <Toast toasts={toasts} removeToast={removeToast} />
         {view === 'main' && renderMainView()}
         {view === 'create' && renderCreateView()}
         {view === 'candidateList' && renderCandidateList()}
      </div>
   );
};

export default AgenticHR;
