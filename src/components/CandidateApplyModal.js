import { useState, useEffect, useCallback, useRef } from 'react';
import { useGlobalContext } from '../globalContext';
import { useNavigate } from 'react-router-dom';
import { useSessionHandler } from '../useSessionHandler';
import '../candidateApplyModal.css';

const API = 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/candidateApply';
const BASE_URL = 'https://www.hrrobots.click';

function CandidateApplyModal({ isOpen, onClose, showToast, template }) {
  const { JWTValue } = useGlobalContext();
  const navigate = useNavigate();

  // Session handler
  const { checkUnauthorized, checkHttpStatus } = useSessionHandler(showToast);

  const [tab, setTab] = useState('jd');
  const [copied, setCopied] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false); // for the detail panel
  const [testScore, setTestScore] = useState(null); // cached score for selectedApp
  const [loadingScore, setLoadingScore] = useState(false);

  // ── JD tab state ────────────────────────────────────────────────────────────
  const [jobDescription, setJobDescription] = useState('');
  const [jdLoading, setJdLoading]           = useState(false);
  const [jdSaving, setJdSaving]             = useState(false);
  const [jdSaved, setJdSaved]               = useState(false);
  const [jdError, setJdError]               = useState('');
  const [jdExtracting, setJdExtracting]     = useState(false); // PDF extraction in progress
  const [jdFileName, setJdFileName]         = useState('');    // name of uploaded PDF
  const jdFileInputRef                      = useRef(null);

  // ── Match threshold state ────────────────────────────────────────────────
  const [matchThreshold, setMatchThreshold]         = useState(80);
  const [thresholdSaving, setThresholdSaving]       = useState(false);
  const [thresholdSaved, setThresholdSaved]         = useState(false);
  const [thresholdError, setThresholdError]         = useState('');

  // ── Submissions search + pagination ─────────────────────────────────────
  const PAGE_SIZE = 8;
  const [subSearch, setSubSearch]   = useState('');
  const [subPage, setSubPage]       = useState(1);

  const applyLink = template ? `${BASE_URL}/apply/${template.templateID}` : '';
  const hasJD = jobDescription.trim().length > 0;

  // ── Load JD when modal opens ────────────────────────────────────────────────
  const loadJD = useCallback(async () => {
    if (!template?.templateID) return;
    setJdLoading(true);
    setJdError('');
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
        body: JSON.stringify({ action: 'getJD', templateID: template.templateID }),
      });
      const data = await res.json();
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
      if (checkUnauthorized(data)) return;
      setJobDescription(parsed.jobDescription || '');
      // Load saved threshold, default to 80 if not set
      if (typeof parsed.matchThreshold === 'number') {
        setMatchThreshold(parsed.matchThreshold);
      } else {
        setMatchThreshold(80);
      }
    } catch {
      setJdError('Failed to load job description.');
    } finally {
      setJdLoading(false);
    }
  }, [template?.templateID, JWTValue]);

  useEffect(() => {
    if (isOpen && template?.templateID) {
      loadJD();
    }
  }, [isOpen, template?.templateID, loadJD]);

  // ── Extract text from a JD PDF ──────────────────────────────────────────────
  const extractJDFromPDF = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setJdError('Only PDF files are accepted.');
      return;
    }
    setJdError('');
    setJdExtracting(true);
    setJdFileName(file.name);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((it) => it.str).join(' '));
      }
      const text = pages.join('\n\n').trim();
      if (!text) {
        setJdError('Could not extract text from this PDF. It may be a scanned image. Please paste the JD manually.');
        return;
      }
      setJobDescription(text);
      setJdSaved(false);
      showToast('success', 'PDF Loaded', `Text extracted from "${file.name}". Review and save.`);
    } catch (err) {
      console.error('JD PDF extraction error:', err);
      setJdError('Failed to read the PDF. Please try again or paste the JD manually.');
    } finally {
      setJdExtracting(false);
      // Reset file input so the same file can be re-uploaded if needed
      if (jdFileInputRef.current) jdFileInputRef.current.value = '';
    }
  };

  const handleJDFileChange = (e) => {
    const file = e.target.files[0];
    if (file) extractJDFromPDF(file);
  };

  // ── Save JD ─────────────────────────────────────────────────────────────────
  const handleSaveJD = async () => {
    setJdSaving(true);
    setJdError('');
    setJdSaved(false);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
        body: JSON.stringify({
          action: 'saveJD',
          templateID: template.templateID,
          jobDescription: jobDescription.trim()
        }),
      });
      const data = await res.json();
      if (checkUnauthorized(data)) return;
      if (data.statusCode === 200 || res.ok) {
        setJdSaved(true);
        showToast('success', 'Saved', 'Job description saved to template.');
        setTimeout(() => setJdSaved(false), 3000);
      } else {
        setJdError('Failed to save. Please try again.');
      }
    } catch {
      setJdError('Network error. Please try again.');
    } finally {
      setJdSaving(false);
    }
  };

  // ── Save threshold ──────────────────────────────────────────────────────────
  const handleSaveThreshold = async () => {
    const value = Math.min(100, Math.max(0, Math.round(matchThreshold)));
    setMatchThreshold(value);
    setThresholdSaving(true);
    setThresholdError('');
    setThresholdSaved(false);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
        body: JSON.stringify({
          action: 'saveThreshold',
          templateID: template.templateID,
          matchThreshold: value
        }),
      });
      const data = await res.json();
      if (checkUnauthorized(data)) return;
      if (data.statusCode === 200 || res.ok) {
        setThresholdSaved(true);
        showToast('success', 'Threshold Saved', `Match threshold set to ${value}%.`);
        setTimeout(() => setThresholdSaved(false), 3000);
      } else {
        setThresholdError('Failed to save. Please try again.');
      }
    } catch {
      setThresholdError('Network error. Please try again.');
    } finally {
      setThresholdSaving(false);
    }
  };

  // ── Load submissions ────────────────────────────────────────────────────────
  const loadSubmissions = useCallback(async () => {
    if (!template?.templateID) return;
    setLoadingList(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
        body: JSON.stringify({ action: 'list', templateID: template.templateID }),
      });
      const data = await res.json();
      if (checkUnauthorized(data)) return;
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
      const apps = (parsed.applications || []).sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );
      setSubmissions(apps);
    } catch {
      showToast('error', 'Error', 'Failed to load submissions.');
    } finally {
      setLoadingList(false);
    }
  }, [template?.templateID, JWTValue, showToast]);

  useEffect(() => {
    if (isOpen && tab === 'submissions') loadSubmissions();
  }, [isOpen, tab, loadSubmissions]);

  const handleCopy = () => {
    navigator.clipboard.writeText(applyLink).then(() => {
      setCopied(true);
      showToast('success', 'Copied!', 'Apply link copied to clipboard.');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleClose = () => {
    setTab('jd');
    setSelectedApp(null);
    setJdSaved(false);
    setJdError('');
    setThresholdSaved(false);
    setThresholdError('');
    setSubSearch('');
    setSubPage(1);
    onClose();
  };

  // ── Generate / re-generate profiler report for a specific application ────────
  const handleGenerateReport = async () => {
    if (!selectedApp) return;
    setGeneratingReport(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
        body: JSON.stringify({
          action: 'generateReport',
          applicationID: selectedApp.applicationID
        }),
      });
      const data = await res.json();
      if (checkUnauthorized(data)) { setGeneratingReport(false); return; }
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
      if (data.statusCode === 200 || res.ok) {
        // Update the selectedApp in place so the UI re-renders immediately
        setSelectedApp(prev => ({
          ...prev,
          profilerReport: JSON.stringify(parsed.profilerReport),
          suitability: parsed.suitability,
        }));
        // Also refresh the submissions list so the score badge updates there too
        setSubmissions(prev => prev.map(a =>
          a.applicationID === selectedApp.applicationID
            ? { ...a, suitability: parsed.suitability }
            : a
        ));
        showToast('success', 'Report Generated', 'Profiler report created successfully.');
      } else {
        showToast('error', 'Failed', parsed.error || 'Could not generate report.');
      }
    } catch {
      showToast('error', 'Network Error', 'Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── Fetch live test status + score when an application is selected ────────
  useEffect(() => {
    setTestScore(null);
    if (!selectedApp?.testID) return;

    const fetchTestStatusAndScore = async () => {
      setLoadingScore(true);
      try {
        // Step 1: get the real test status from testTransactions
        const statusRes = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkTestStatus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
          body: JSON.stringify({ testID: selectedApp.testID }),
        });
        const statusData = await statusRes.json();
        if (statusData.statusCode !== 200) return;
        const statusBody = typeof statusData.body === 'string' ? JSON.parse(statusData.body) : statusData.body;
        const liveStatus = statusBody.status; // "Not Started" | "In Progress" | "Completed" | "Terminated"

        const isCompleted = liveStatus === 'Completed' || liveStatus === 'Complete';
        const isTerminated = liveStatus === 'Terminated';

        if (!isCompleted && !isTerminated) {
          // Test not done yet — store status so we can show it, but no score
          setTestScore({ liveStatus, pct: null, correct: null, total: null });
          return;
        }

        // Step 2: fetch score for completed / terminated tests
        const scoreRes = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult_', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': JWTValue,
          },
          body: JSON.stringify({ searchTerm: selectedApp.testID }),
        });
        const scoreData = await scoreRes.json();
        if (scoreData.statusCode === 200) {
          const parsed = typeof scoreData.body === 'string' ? JSON.parse(scoreData.body) : scoreData.body;
          const total = parsed.totalQuestions || 0;
          const correct = parsed.correctAnswers || 0;
          const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
          setTestScore({ liveStatus, correct, total, pct });
        } else {
          setTestScore({ liveStatus, pct: null, correct: null, total: null });
        }
      } catch {
        // silently ignore — status will fall back to app record
      } finally {
        setLoadingScore(false);
      }
    };

    fetchTestStatusAndScore();
  }, [selectedApp, JWTValue]);

  // ── Navigate to result page for a specific test ───────────────────────────
  const handleViewTestResult = () => {
    if (!selectedApp?.testID) return;
    handleClose();
    const liveStatus = testScore?.liveStatus || selectedApp.status;
    navigate('/result', { state: { testID: selectedApp.testID, itemData: { status: liveStatus } } });
  };

  /* ── Derived: filtered + paginated submissions ──────────────────────────── */
  const filteredSubs = submissions.filter(app => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      app.candidateName.toLowerCase().includes(q) ||
      app.candidateEmail.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / PAGE_SIZE));
  const safePage   = Math.min(subPage, totalPages);
  const pagedSubs  = filteredSubs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);



  /* ── Detail panel ──────────────────────────────────────────────────────── */
  if (selectedApp) {
    let report = null;
    try { report = selectedApp.profilerReport ? JSON.parse(selectedApp.profilerReport) : null; } catch {}
    const score = selectedApp.suitability || report?.Suitability || null;
    const scoreNum = parseInt(String(score || '0').replace('%', '')) || 0;
    const scoreClass = scoreNum >= 75 ? 'score--high' : scoreNum >= 50 ? 'score--mid' : scoreNum > 0 ? 'score--low' : 'score--none';

    return (
      <div className="cam-overlay" onClick={handleClose}>
        <div className="cam-modal cam-modal--wide" onClick={e => e.stopPropagation()}>
          <div className="cam-detail-header">
            <button className="cam-back-btn" onClick={() => setSelectedApp(null)}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back
            </button>
            <div className="cam-detail-name">
              <div className="cam-avatar cam-avatar--lg">{selectedApp.candidateName.charAt(0).toUpperCase()}</div>
              <div>
                <h2>{selectedApp.candidateName}</h2>
                <span className="cam-email">{selectedApp.candidateEmail}</span>
              </div>
            </div>
            {score && <span className={`cam-score-badge ${scoreClass}`}>{score}</span>}
          </div>

          <div className="cam-detail-body">
            <div className="cam-info-grid">
              {[
                ['Phone', selectedApp.candidatePhone || '—'],
                ['Applied', new Date(selectedApp.submittedAt).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="cam-info-cell">
                  <span className="cam-info-label">{label}</span>
                  <span className="cam-info-value">{val}</span>
                </div>
              ))}
              <div className="cam-info-cell">
                <span className="cam-info-label">Status</span>
                {loadingScore ? (
                  // Still checking live status — show a loading pill
                  <span className="cam-test-status-badge cam-test-status-badge--loading">
                    <div className="cam-spinner cam-spinner--sm" style={{ borderTopColor: '#64748b', borderColor: '#e2e8f0' }} />
                    Checking…
                  </span>
                ) : (() => {
                  const liveStatus = testScore?.liveStatus || selectedApp.status || 'Applied';
                  const isCompleted = liveStatus === 'Completed' || liveStatus === 'Complete';
                  const isTerminated = liveStatus === 'Terminated';
                  const canViewResult = isCompleted || isTerminated;

                  if (canViewResult) {
                    return (
                      <button
                        className="cam-status-result-btn"
                        onClick={handleViewTestResult}
                        title="Click to view test result"
                      >
                        <span className={`cam-test-status-badge cam-test-status-badge--${isCompleted ? 'completed' : 'terminated'}`}>
                          {isTerminated ? 'Terminated' : 'Completed'}
                          {testScore?.pct != null && <> — {testScore.pct}%</>}
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style={{ marginLeft: 4, flexShrink: 0 }}>
                          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    );
                  }
                  return (
                    <span className={`cam-test-status-badge cam-test-status-badge--${liveStatus === 'In Progress' ? 'inprogress' : 'pending'}`}>
                      {liveStatus}
                    </span>
                  );
                })()}
              </div>
              <div className="cam-info-cell cam-info-cell--full">
                <span className="cam-info-label">Test Link</span>
                <a href={selectedApp.testLink} target="_blank" rel="noreferrer" className="cam-test-link">{selectedApp.testLink}</a>
              </div>
            </div>

            {report ? (
              <div className="cam-report">
                <h3 className="cam-report-title">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  AI Profiler Report
                  {hasJD && (
                    <button
                      className="cam-report-regen-btn"
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      title="Re-generate with latest JD"
                    >
                      {generatingReport ? (
                        <><div className="cam-spinner cam-spinner--sm" style={{ borderTopColor: '#2563eb', borderColor: '#dbeafe' }} /> Generating…</>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Re-generate
                        </>
                      )}
                    </button>
                  )}
                </h3>                {report.Summary && (
                  <div className="cam-report-section">
                    <span className="cam-report-section-label">Summary</span>
                    <p>{report.Summary}</p>
                  </div>
                )}
                {report.Conclusion && (
                  <div className="cam-report-section">
                    <span className="cam-report-section-label">Conclusion</span>
                    <p>{report.Conclusion}</p>
                  </div>
                )}
                <div className="cam-report-lists">
                  {[
                    ['Matching Skills', report.Matching, 'chip--green'],
                    ['Skill Gaps', report.Gaps, 'chip--red'],
                    ['Strengths', report.AdditionalStrengths, 'chip--blue'],
                    ['Improvements', report.SuggestedImprovements, 'chip--amber'],
                  ].filter(([, items]) => items?.length).map(([label, items, chipClass]) => (
                    <div key={label} className="cam-report-list-col">
                      <span className="cam-report-section-label">{label}</span>
                      <div className="cam-chip-group">
                        {items.map((it, i) => <span key={i} className={`cam-chip ${chipClass}`}>{it}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="cam-empty-report">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <p>No profiler report available.{!hasJD && ' Add a Job Description to this template to enable AI scoring.'}</p>
                {hasJD && (
                  <button
                    className="cam-btn cam-btn--primary"
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    style={{ marginTop: '12px' }}
                  >
                    {generatingReport ? (
                      <><div className="cam-spinner cam-spinner--sm cam-spinner--white" /> Generating…</>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Generate Profiler Report
                      </>
                    )}
                  </button>
                )}
                {!hasJD && (
                  <button
                    className="cam-btn cam-btn--ghost"
                    onClick={() => { setSelectedApp(null); setTab('jd'); }}
                    style={{ marginTop: '12px' }}
                  >
                    Add Job Description →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="cam-footer">
            <button className="cam-btn cam-btn--ghost" onClick={() => setSelectedApp(null)}>← Back to List</button>
            <button className="cam-btn cam-btn--primary" onClick={handleClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }


  /* ── Main modal ────────────────────────────────────────────────────────── */
  return (
    <div className="cam-overlay" onClick={handleClose}>
      <div className="cam-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cam-header">
          <div className="cam-header-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="cam-header-text">
            <h2>Request Application</h2>
            <p>{template.templateName}</p>
          </div>
          <button className="cam-close-btn" onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="cam-tabs">
          <button className={`cam-tab ${tab === 'jd' ? 'cam-tab--active' : ''}`} onClick={() => setTab('jd')}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Job Description
            {!hasJD && !jdLoading && <span className="cam-tab-badge cam-tab-badge--warn">!</span>}
          </button>
          <button className={`cam-tab ${tab === 'link' ? 'cam-tab--active' : ''}`} onClick={() => setTab('link')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Share Link
          </button>
          <button className={`cam-tab ${tab === 'submissions' ? 'cam-tab--active' : ''}`} onClick={() => setTab('submissions')}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Submissions
            {submissions.length > 0 && <span className="cam-tab-badge">{submissions.length}</span>}
          </button>
        </div>


        {/* ── Tab: Job Description ─────────────────────────────────────────── */}
        {tab === 'jd' && (
          <div className="cam-body">
            <p className="cam-intro">
              Add a job description so our AI can score each candidate's resume against this role.
              Without a JD, applications are still collected but no suitability score is generated.
            </p>

            {jdLoading ? (
              <div className="cam-loading">
                <div className="cam-spinner" />
                <p>Loading…</p>
              </div>
            ) : (
              <>
                <div className="cam-jd-field">
                  <div className="cam-jd-label-row">
                    <label className="cam-jd-label" htmlFor="cam-jd-textarea">
                      Job Description
                      {hasJD && (
                        <span className="cam-jd-badge cam-jd-badge--set">
                          <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Saved
                        </span>
                      )}
                      {!hasJD && (
                        <span className="cam-jd-badge cam-jd-badge--missing">Not set — AI scoring disabled</span>
                      )}
                    </label>

                    {/* PDF upload button */}
                    <button
                      type="button"
                      className="cam-jd-pdf-btn"
                      onClick={() => jdFileInputRef.current?.click()}
                      disabled={jdExtracting}
                      title="Upload JD as PDF"
                    >
                      {jdExtracting ? (
                        <><div className="cam-spinner cam-spinner--sm" style={{ borderTopColor: '#2563eb', borderColor: '#dbeafe' }} /> Extracting…</>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Upload PDF
                        </>
                      )}
                    </button>
                    <input
                      ref={jdFileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleJDFileChange}
                      style={{ display: 'none' }}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Show filename after extraction */}
                  {jdFileName && !jdExtracting && (
                    <div className="cam-jd-source">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Extracted from <strong>{jdFileName}</strong> — review and edit below before saving.
                    </div>
                  )}

                  <textarea
                    id="cam-jd-textarea"
                    className={`cam-jd-textarea ${jdExtracting ? 'cam-jd-textarea--extracting' : ''}`}
                    rows={12}
                    placeholder={`Paste the full job description here, or upload a PDF above…\n\nExample:\nWe are looking for a Senior React Developer with 3+ years of experience...\n\nResponsibilities:\n- Build and maintain frontend applications\n- Collaborate with backend teams\n\nRequirements:\n- React, TypeScript, REST APIs\n- Strong problem-solving skills`}
                    value={jdExtracting ? '' : jobDescription}
                    onChange={e => { setJobDescription(e.target.value); setJdSaved(false); }}
                    disabled={jdExtracting}
                  />
                  {jdExtracting && (
                    <div className="cam-jd-extracting-overlay">
                      <div className="cam-spinner" />
                      <span>Extracting text from PDF…</span>
                    </div>
                  )}

                  <div className="cam-jd-footer">
                    <span className="cam-jd-count">{jobDescription.trim().length.toLocaleString()} characters</span>
                    {jdError && <span className="cam-jd-error">{jdError}</span>}
                    <button
                      className={`cam-btn cam-btn--primary ${jdSaved ? 'cam-btn--saved' : ''}`}
                      onClick={handleSaveJD}
                      disabled={jdSaving || jdExtracting || !hasJD}
                    >
                      {jdSaving ? (
                        <><div className="cam-spinner cam-spinner--sm cam-spinner--white" /> Saving…</>
                      ) : jdSaved ? (
                        <><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved!</>
                      ) : (
                        <><svg viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Save JD</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="cam-jd-info">
                  <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <div>
                    <strong>How the JD is used</strong>
                    <p>When a candidate submits their resume, Amazon Nova compares it against this job description and generates a suitability score, skill match, and gap analysis — visible in the Submissions tab.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}


        {/* ── Tab: Share Link ─────────────────────────────────────────────── */}
        {tab === 'link' && (
          <>
            {/* Link bar — lives OUTSIDE the scrollable body so it never scrolls away */}
            <div className="cam-link-bar">
              <div className="cam-link-display">
                <svg viewBox="0 0 24 24" fill="none" className="cam-link-icon"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span className="cam-link-text">{applyLink}</span>
              </div>
              <button className={`cam-copy-btn ${copied ? 'cam-copy-btn--done' : ''}`} onClick={handleCopy}>
                {copied ? (
                  <><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied!</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Copy Link</>
                )}
              </button>
            </div>

            <div className="cam-body cam-body--link-tab">
              {/* JD warning / ready banner */}
              {!hasJD && !jdLoading && (
                <div className="cam-jd-warning" role="alert">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <div>
                    <strong>No Job Description set</strong>
                    <span>AI candidate scoring is disabled. <button className="cam-jd-warning-link" onClick={() => setTab('jd')}>Add a JD →</button></span>
                  </div>
                </div>
              )}
              {hasJD && (
                <div className="cam-jd-ready" role="status">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>AI scoring is active — candidates will be scored against your job description.</span>
                </div>
              )}

              {/* ── Match Threshold ──────────────────────────────────────── */}
              {hasJD && (
                <div className="cam-threshold-card">
                  <div className="cam-threshold-header">
                    <div className="cam-threshold-title">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <strong>JD Match Threshold</strong>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                      <span className="cam-threshold-badge" style={{
                        background: matchThreshold >= 80 ? '#f0fdf4' : matchThreshold >= 60 ? '#fefce8' : '#fef2f2',
                        color: matchThreshold >= 80 ? '#166534' : matchThreshold >= 60 ? '#854d0e' : '#991b1b',
                        border: `1px solid ${matchThreshold >= 80 ? '#bbf7d0' : matchThreshold >= 60 ? '#fde047' : '#fecaca'}`,
                      }}>
                        {matchThreshold}%
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={matchThreshold}
                        onChange={e => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value)));
                          setMatchThreshold(v);
                          setThresholdSaved(false);
                        }}
                        className="cam-threshold-number"
                        aria-label="Match threshold value"
                      />
                      <button
                        className={`cam-btn cam-btn--primary cam-btn--sm ${thresholdSaved ? 'cam-btn--saved' : ''}`}
                        onClick={handleSaveThreshold}
                        disabled={thresholdSaving}
                      >
                        {thresholdSaving ? (
                          <><div className="cam-spinner cam-spinner--sm cam-spinner--white" /> Saving…</>
                        ) : thresholdSaved ? (
                          <><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Saved!</>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={matchThreshold}
                    onChange={e => { setMatchThreshold(Number(e.target.value)); setThresholdSaved(false); }}
                    className="cam-threshold-slider"
                    aria-label="Match threshold percentage"
                    style={{
                      margin: '2px 0 0',
                      background: `linear-gradient(to right, #2563eb ${matchThreshold}%, #e2e8f0 ${matchThreshold}%)`
                    }}
                  />
                  <p className="cam-threshold-desc" style={{margin:'2px 0 0'}}>
                    Candidates at or near this score get the test link. Those below receive a polite mismatch email. A ±5% tolerance is applied.
                  </p>
                  {thresholdError && <span className="cam-jd-error" style={{marginTop: '2px', display: 'block'}}>{thresholdError}</span>}
                </div>
              )}
              {!hasJD && !jdLoading && (
                <div className="cam-threshold-card cam-threshold-card--disabled">
                  <div className="cam-threshold-header">
                    <div className="cam-threshold-title">
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <strong>JD Match Threshold</strong>
                    </div>
                    <span className="cam-threshold-badge" style={{background:'#f1f5f9',color:'#94a3b8',border:'1px solid #e2e8f0'}}>
                      Disabled
                    </span>
                  </div>
                  <p className="cam-threshold-desc">
                    Add a Job Description to enable match threshold filtering. Without a JD, all candidates receive the test link.
                  </p>
                </div>
              )}

              {/* How it works */}
              <div className="cam-how">
                <h4 className="cam-how-title">How it works</h4>
                <div className="cam-steps">
                  {[
                    { n: '1', icon: <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>, label: 'Candidate opens the link', sub: 'Fills in Name, Email, Phone & uploads their CV' },
                    { n: '2', icon: <svg viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'AI scores their profile', sub: 'Resume is matched against your job description instantly' },
                    { n: '3', icon: <svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Result sent by email', sub: `Candidates meeting the ${matchThreshold}% threshold receive the test link; others get a mismatch email` },
                  ].map(step => (
                    <div key={step.n} className="cam-step">
                      <div className="cam-step-icon">{step.icon}</div>
                      <div className="cam-step-body">
                        <strong>{step.label}</strong>
                        <span>{step.sub}</span>
                      </div>
                      <div className="cam-step-num">{step.n}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}


        {/* ── Tab: Submissions ────────────────────────────────────────────── */}
        {tab === 'submissions' && (
          <div className="cam-body">
            {loadingList ? (
              <div className="cam-loading">
                <div className="cam-spinner" />
                <p>Loading submissions…</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="cam-empty">
                <svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p>No applications yet.</p>
                <span>Share the apply link to start receiving candidates.</span>
              </div>
            ) : (
              <>
                {/* Search + meta row */}
                <div className="cam-sub-toolbar">
                  <div className="cam-sub-search">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={subSearch}
                      onChange={e => { setSubSearch(e.target.value); setSubPage(1); }}
                      className="cam-sub-search-input"
                      aria-label="Search candidates"
                    />
                    {subSearch && (
                      <button className="cam-sub-search-clear" onClick={() => { setSubSearch(''); setSubPage(1); }} aria-label="Clear search">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                  <div className="cam-sub-meta">
                    <span>
                      {subSearch
                        ? `${filteredSubs.length} of ${submissions.length}`
                        : `${submissions.length}`
                      } application{submissions.length !== 1 ? 's' : ''}
                    </span>
                    <button className="cam-refresh-btn" onClick={loadSubmissions} title="Refresh">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {/* List */}
                {filteredSubs.length === 0 ? (
                  <div className="cam-empty">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <p>No matches for "{subSearch}"</p>
                    <span>Try a different name or email.</span>
                  </div>
                ) : (
                  <div className="cam-list">
                    {pagedSubs.map(app => {
                      const score = app.suitability || '—';
                      const scoreNum = parseInt(String(score).replace('%', '')) || 0;
                      const scoreClass = scoreNum >= 75 ? 'score--high' : scoreNum >= 50 ? 'score--mid' : scoreNum > 0 ? 'score--low' : 'score--none';
                      return (
                        <button key={app.applicationID} className="cam-list-item" onClick={() => setSelectedApp(app)}>
                          <div className="cam-avatar">{app.candidateName.charAt(0).toUpperCase()}</div>
                          <div className="cam-list-info">
                            <strong>{app.candidateName}</strong>
                            <span>{app.candidateEmail}</span>
                          </div>
                          <div className="cam-list-right">
                            <span className={`cam-score-badge ${scoreClass}`}>{score}</span>
                            <span className="cam-list-date">{new Date(app.submittedAt).toLocaleDateString()}</span>
                          </div>
                          <svg className="cam-chevron" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="cam-pagination">
                    <button
                      className="cam-page-btn"
                      onClick={() => setSubPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        className={`cam-page-btn ${n === safePage ? 'cam-page-btn--active' : ''}`}
                        onClick={() => setSubPage(n)}
                        aria-label={`Page ${n}`}
                        aria-current={n === safePage ? 'page' : undefined}
                      >
                        {n}
                      </button>
                    ))}

                    <button
                      className="cam-page-btn"
                      onClick={() => setSubPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                    >
                      <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="cam-footer">
          <button className="cam-btn cam-btn--ghost" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default CandidateApplyModal;
