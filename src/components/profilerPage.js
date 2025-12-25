import { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";
import "../profilerPage.css";
import "../CreateTemplate.css";

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

const ProfilerPage = () => {
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [toasts, setToasts] = useState([]);
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

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      if (type === 'jobDescription') {
        setJobDescriptionFile(file);
        extractTextFromPDF(file, setJobDescriptionText);
      } else if (type === 'resume') {
        setResumeFile(file);
        extractTextFromPDF(file, setResumeText);
      }
    } else {
      showToast('error', 'Invalid File', 'Please upload a valid PDF file.');
    }
  };

  const extractTextFromPDF = async (file, setTextCallback) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const extractedText = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText.push(pageText);
    }
    const fullText = extractedText.join(' ');
    setTextCallback(fullText);
    return fullText;
  };

  const handlePrint = () => {
    const printableContent = document.getElementById("printableContent");
    const printWindow = window.open("", "_blank");
    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.8;
          color: #374151;
          padding: 40px 50px;
          max-width: 900px;
          margin: 0 auto;
        }
        h1 {
          color: #1CBBB4;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 1.5rem 0;
          padding-bottom: 12px;
          border-bottom: 3px solid #1CBBB4;
        }
        h2 {
          color: #2d3748;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        .report-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        .report-body {
          padding: 20px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
        }
        .report-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        .report-table tr:last-child td {
          border-bottom: none;
        }
        .report-table td:first-child {
          font-weight: 600;
          width: 200px;
          background: #f8fafc;
          color: #2d3748;
        }
        ul {
          margin: 0;
          padding-left: 20px;
        }
        li {
          margin-bottom: 5px;
        }
        .suitability-badge {
          display: inline-block;
          padding: 6px 14px;
          background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
          color: white;
          border-radius: 20px;
          font-weight: 600;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #6b7280;
          font-size: 0.9rem;
        }
        @media print {
          body { padding: 20px 30px; }
        }
      </style>
    `;
    printWindow.document.write(`
      <html>
        <head><title>Suitability Report - ${report?.CandidateName || 'Candidate'}</title>${styles}</head>
        <body>
          <h1>Suitability Report: ${report?.CandidateName || 'Candidate'}</h1>
          ${printableContent.innerHTML}
          <div class="footer">Powered by HR Robots | www.hrrobots.com</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateReport = async () => {
    if (!jobDescriptionText) {
      showToast('warning', 'Missing File', 'Please upload the job description.');
      return;
    }
    if (!resumeText) {
      showToast('warning', 'Missing File', "Please upload the candidate's resume.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/matchJDResume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jobDescriptionText, resume: resumeText, token: JWTValue })
      });
      const data = await response.json();
      if (checkUnauthorized(data)) {
        setIsGenerating(false);
        return;
      }
      const parsedBody = JSON.parse(data.body);
      const responseContent = parsedBody.data;
      setReport(responseContent);
      setShowForm(false);
    } catch (error) {
      console.error(error);
      showToast('error', 'Error', 'Error generating suitability report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderList = (items) => (
    <ul>
      {items && items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );

  return (
    <div className="profiler-page">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="profiler-container">
        {showForm ? (
        <>
        <div className="profiler-header">
          <button onClick={() => navigate(-1)} className="profiler-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Candidate Profiler</h1>
        </div>

        <div className="upload-section">
          <div className={`upload-card ${jobDescriptionFile ? 'has-file' : ''}`}>
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h3>Job Description</h3>
            <p>Upload the job description PDF</p>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, 'jobDescription')}
                id="jd-upload"
              />
              <label htmlFor="jd-upload" className="file-input-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose File
              </label>
            </div>
            {jobDescriptionFile && (
              <div className="file-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {jobDescriptionFile.name}
              </div>
            )}
          </div>

          <div className={`upload-card ${resumeFile ? 'has-file' : ''}`}>
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h3>Candidate Resume</h3>
            <p>Upload the candidate's resume PDF</p>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, 'resume')}
                id="resume-upload"
              />
              <label htmlFor="resume-upload" className="file-input-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose File
              </label>
            </div>
            {resumeFile && (
              <div className="file-name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {resumeFile.name}
              </div>
            )}
          </div>
        </div>

        <div className="btn-wrapper">
          <button className="submit-btn" onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Generate Suitability Report
              </>
            )}
          </button>
        </div>
        </>
        ) : (
        <div className="profiler-header">
          <button onClick={() => navigate(-1)} className="profiler-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Candidate Suitability Report</h1>
          <button className="print-btn" onClick={handlePrint}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
        </div>
        )}

        {report && (
          <div className="report-section" id="printableContent">
            <div className="report-card">
              <div className="report-body">
                <table className="report-table">
                  <tbody>
                    <tr>
                      <td>Candidate Name</td>
                      <td>{report.CandidateName}</td>
                    </tr>
                    <tr>
                      <td>Summary</td>
                      <td>{report.Summary}</td>
                    </tr>
                    <tr>
                      <td>Suitability Score</td>
                      <td><span className="suitability-badge">{report.Suitability}</span></td>
                    </tr>
                    <tr>
                      <td>Key Matching Skills</td>
                      <td>{renderList(report.Matching)}</td>
                    </tr>
                    <tr>
                      <td>Gaps in Skills/Experience</td>
                      <td>{renderList(report.Gaps)}</td>
                    </tr>
                    <tr>
                      <td>Additional Strengths</td>
                      <td>{renderList(report.AdditionalStrengths)}</td>
                    </tr>
                    <tr>
                      <td>Suggested Improvements</td>
                      <td>{renderList(report.SuggestedImprovements)}</td>
                    </tr>
                    <tr>
                      <td>Conclusion</td>
                      <td>{report.Conclusion}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilerPage;
