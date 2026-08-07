import { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";
import { logProfilerPageActivity } from '../utils/activityLogger';
import { useSessionHandler } from "../useSessionHandler";
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

const ProfilerPageMultiple = () => {
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [resumeFiles, setResumeFiles] = useState([]);
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [resumeTexts, setResumeTexts] = useState([]);
  const [reports, setReports] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const { globalValue, JWTValue } = useGlobalContext();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {};
  }, []);

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
  const { checkUnauthorized, checkHttpStatus } = useSessionHandler(showToast);

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
  }, [globalValue, navigate]);

  const handleJDFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      logProfilerPageActivity(globalValue, 'file_uploaded', {
        fileType: 'jobDescription',
        fileName: file.name,
        fileSize: file.size,
        status: 'success'
      }, JWTValue);
      setJobDescriptionFile(file);
      extractTextFromPDF(file, setJobDescriptionText);
    } else {
      showToast('error', 'Invalid File', 'Please upload a valid PDF file.');
    }
  };

  const handleResumeFilesChange = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type === 'application/pdf');
    
    if (validFiles.length !== files.length) {
      showToast('warning', 'Invalid Files', 'Some files were skipped. Only PDF files are allowed.');
    }
    
    if (validFiles.length === 0) {
      showToast('error', 'No Valid Files', 'Please upload at least one PDF file.');
      return;
    }

    if (validFiles.length > 50) {
      showToast('warning', 'Too Many Files', 'Maximum 50 resumes can be processed at once. Only first 50 will be used.');
      validFiles.splice(50);
    }

    setResumeFiles(validFiles);
    
    // Extract text from all resumes
    showToast('info', 'Processing', `Extracting text from ${validFiles.length} resumes...`);
    const extractedTexts = [];
    
    for (const file of validFiles) {
      try {
        const text = await extractTextFromPDFAsync(file);
        extractedTexts.push({ name: file.name, text });
      } catch (error) {
        console.error(`Error extracting text from ${file.name}:`, error);
        extractedTexts.push({ name: file.name, text: '', error: true });
      }
    }
    
    setResumeTexts(extractedTexts);
    showToast('success', 'Ready', `${extractedTexts.length} resumes ready for analysis.`);
  };

  const removeResume = (index) => {
    setResumeFiles(prev => prev.filter((_, i) => i !== index));
    setResumeTexts(prev => prev.filter((_, i) => i !== index));
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

  const extractTextFromPDFAsync = async (file) => {
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

  const generateBatchReport = async () => {
    if (!jobDescriptionText) {
      showToast('warning', 'Missing File', 'Please upload the job description.');
      return;
    }
    if (resumeTexts.length === 0) {
      showToast('warning', 'Missing Files', "Please upload at least one candidate resume.");
      return;
    }

    setIsGenerating(true);
    setProcessingProgress({ current: 0, total: resumeTexts.length });
    const startTime = Date.now();
    
    try {
      const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/matchJDResumeMultiple", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": JWTValue },
        body: JSON.stringify({ 
          jobDescription: jobDescriptionText, 
          resumes: resumeTexts,
          token: JWTValue 
        })
      });
      
      const data = await response.json();
      if (checkUnauthorized(data)) {
        setIsGenerating(false);
        return;
      }
      
      const parsedBody = JSON.parse(data.body);
      const duration = Date.now() - startTime;
      
      await logProfilerPageActivity(globalValue, 'batch_report_generated', {
        totalResumes: resumeTexts.length,
        successful: parsedBody.summary.successful,
        failed: parsedBody.summary.failed,
        status: 'success',
        duration: duration
      }, JWTValue);
      
      setReports(parsedBody.results);
      setShowForm(false);
      showToast('success', 'Complete', `Processed ${parsedBody.summary.successful} resumes successfully!`);
    } catch (error) {
      const duration = Date.now() - startTime;
      await logProfilerPageActivity(globalValue, 'batch_report_generated', {
        status: 'error',
        duration: duration,
        errorMessage: error.message
      }, JWTValue);
      
      showToast('error', 'Error', 'Error generating batch suitability reports.');
    } finally {
      setIsGenerating(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  const handlePrintAll = () => {
    const printWindow = window.open("", "_blank");
    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.8; color: #374151; padding: 40px 50px; }
        h1 { color: #2563eb; font-size: 1.75rem; font-weight: 700; margin: 0 0 1.5rem 0; padding-bottom: 12px; border-bottom: 3px solid #2563eb; }
        h2 { color: #2d3748; font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
        .report-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 30px; page-break-inside: avoid; }
        .report-body { padding: 20px; }
        .report-table { width: 100%; border-collapse: collapse; }
        .report-table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .report-table tr:last-child td { border-bottom: none; }
        .report-table td:first-child { font-weight: 600; width: 200px; background: #f8fafc; color: #2d3748; }
        ul { margin: 0; padding-left: 20px; }
        li { margin-bottom: 5px; }
        .suitability-badge { display: inline-block; padding: 6px 14px; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; border-radius: 20px; font-weight: 600; }
        .page-break { page-break-after: always; }
        @media print { body { padding: 20px 30px; } }
      </style>
    `;
    
    const reportsHTML = reports.map((report, index) => {
      if (report.status === 'failed') {
        return `<div class="report-card"><div class="report-body"><h2>❌ ${report.resumeName}</h2><p style="color: red;">Error: ${report.error}</p></div></div>`;
      }
      return `
        <div class="report-card">
          <div class="report-body">
            <h2>${index + 1}. ${report.CandidateName} - <span class="suitability-badge">${report.Suitability}</span></h2>
            <table class="report-table">
              <tbody>
                <tr><td>Summary</td><td>${report.Summary}</td></tr>
                <tr><td>Key Matching Skills</td><td><ul>${(report.Matching || []).map(item => `<li>${item}</li>`).join('')}</ul></td></tr>
                <tr><td>Gaps</td><td><ul>${(report.Gaps || []).map(item => `<li>${item}</li>`).join('')}</ul></td></tr>
                <tr><td>Additional Strengths</td><td><ul>${(report.AdditionalStrengths || []).map(item => `<li>${item}</li>`).join('')}</ul></td></tr>
                <tr><td>Conclusion</td><td>${report.Conclusion}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        ${index < reports.length - 1 ? '<div class="page-break"></div>' : ''}
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head><title>Batch Suitability Report</title>${styles}</head>
        <body>
          <h1>Batch Suitability Report - ${reports.length} Candidates</h1>
          ${reportsHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const exportToCSV = () => {
    const headers = [
      'Candidate Name', 
      'Resume File', 
      'Suitability', 
      'Summary', 
      'Key Matching Skills', 
      'Gaps in Skills/Experience', 
      'Additional Strengths', 
      'Suggested Improvements', 
      'Conclusion', 
      'Status'
    ];
    
    const rows = reports.map(report => {
      if (report.status === 'failed') {
        return [
          report.resumeName, 
          report.resumeName, 
          'N/A', 
          `Error: ${report.error}`, 
          '', 
          '', 
          '', 
          '', 
          '', 
          'Failed'
        ];
      }
      
      // Convert arrays to formatted strings
      const formatList = (items) => {
        if (!items || !Array.isArray(items)) return '';
        return items.map((item, index) => `${index + 1}. ${item}`).join('; ');
      };
      
      return [
        report.CandidateName || '',
        report.resumeName || '',
        report.Suitability || '',
        (report.Summary || '').replace(/,/g, ';').replace(/"/g, '""'),
        formatList(report.Matching),
        formatList(report.Gaps),
        formatList(report.AdditionalStrengths),
        formatList(report.SuggestedImprovements),
        (report.Conclusion || '').replace(/,/g, ';').replace(/"/g, '""'),
        'Success'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `candidate_batch_report_${Date.now()}.csv`;
    link.click();
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
          <h1>Batch Candidate Profiler</h1>
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
                onChange={handleJDFileChange}
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

          <div className={`upload-card ${resumeFiles.length > 0 ? 'has-file' : ''}`} style={{ minHeight: '300px' }}>
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h3>Candidate Resumes</h3>
            <p>Upload multiple resume PDFs (max 50)</p>
            <div className="file-input-wrapper">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleResumeFilesChange}
                id="resume-upload"
                multiple
              />
              <label htmlFor="resume-upload" className="file-input-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Choose Files
              </label>
            </div>
            {resumeFiles.length > 0 && (
              <div style={{ marginTop: '15px', maxHeight: '150px', overflowY: 'auto', width: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
                {resumeFiles.map((file, index) => (
                  <div key={index} className="file-tag" title={file.name}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <button onClick={() => removeResume(index)} className="file-tag-remove" title="Remove file">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="btn-wrapper">
          <button className="submit-btn" onClick={generateBatchReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Processing {processingProgress.current} of {processingProgress.total}...
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
                Generate Batch Reports ({resumeFiles.length} resumes)
              </>
            )}
          </button>
        </div>
        </>
        ) : (
        <>
        <div className="profiler-header">
          <button onClick={() => { setShowForm(true); setReports([]); }} className="profiler-back-btn" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>Batch Suitability Reports ({reports.length} Candidates)</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="print-btn" onClick={exportToCSV}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            <button className="print-btn" onClick={handlePrintAll}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print All
            </button>
          </div>
        </div>

        <div className="report-section">
          {reports.map((report, index) => (
            <div key={index} className="report-card" style={{ marginBottom: '30px' }}>
              <div className="report-body">
                {report.status === 'failed' ? (
                  <div>
                    <h2 style={{ color: '#e53e3e', marginBottom: '15px' }}>
                      ❌ {report.resumeName}
                    </h2>
                    <p style={{ color: '#e53e3e' }}>Error: {report.error}</p>
                  </div>
                ) : (
                  <>
                    <h2 style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>
                      {index + 1}. {report.CandidateName}
                      <span className="suitability-badge" style={{ marginLeft: '15px' }}>{report.Suitability}</span>
                    </h2>
                    <table className="report-table">
                      <tbody>
                        <tr>
                          <td>Resume File</td>
                          <td>{report.resumeName}</td>
                        </tr>
                        <tr>
                          <td>Summary</td>
                          <td>{report.Summary}</td>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default ProfilerPageMultiple;
