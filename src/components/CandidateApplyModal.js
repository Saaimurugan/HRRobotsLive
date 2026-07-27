import { useState, useEffect, useCallback } from 'react';
import { useGlobalContext } from '../globalContext';
import '../candidateApplyModal.css';

const API = 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/candidateApply';
const BASE_URL = 'https://www.hrrobots.click';

function CandidateApplyModal({ isOpen, onClose, showToast, template }) {
  const { JWTValue } = useGlobalContext();
  const [tab, setTab] = useState('link');
  const [copied, setCopied] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  const applyLink = template ? `${BASE_URL}/apply/${template.templateID}` : '';

  const loadSubmissions = useCallback(async () => {
    if (!template?.templateID) return;
    setLoadingList(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', templateID: template.templateID, token: JWTValue }),
      });
      const data = await res.json();
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
    setTab('link');
    setSelectedApp(null);
    onClose();
  };

  if (!isOpen || !template) return null;

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
            {/* Contact grid */}
            <div className="cam-info-grid">
              {[
                ['Phone', selectedApp.candidatePhone || '—'],
                ['Applied', new Date(selectedApp.submittedAt).toLocaleString()],
                ['Status', selectedApp.status || 'Applied'],
              ].map(([label, val]) => (
                <div key={label} className="cam-info-cell">
                  <span className="cam-info-label">{label}</span>
                  <span className="cam-info-value">{val}</span>
                </div>
              ))}
              <div className="cam-info-cell cam-info-cell--full">
                <span className="cam-info-label">Test Link</span>
                <a href={selectedApp.testLink} target="_blank" rel="noreferrer" className="cam-test-link">{selectedApp.testLink}</a>
              </div>
            </div>

            {/* Profiler report */}
            {report ? (
              <div className="cam-report">
                <h3 className="cam-report-title">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  AI Profiler Report
                </h3>

                {report.Summary && (
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
                <p>No profiler report available. Attach a Job Description to your template to enable AI scoring.</p>
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

        {/* ── Tab: Share Link ─────────────────────────────────────────────── */}
        {tab === 'link' && (
          <div className="cam-body">
            <p className="cam-intro">
              Share this link publicly. Candidates fill in their details and upload their CV — our AI instantly scores their profile and emails them a personalised assessment link.
            </p>

            {/* Link box */}
            <div className="cam-link-box">
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

            {/* How it works */}
            <div className="cam-how">
              <h4 className="cam-how-title">How it works</h4>
              <div className="cam-steps">
                {[
                  { n: '1', icon: <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>, label: 'Candidate opens the link', sub: 'Fills in Name, Email, Phone & uploads their CV' },
                  { n: '2', icon: <svg viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'AI scores their profile', sub: 'Resume is matched against your job description instantly' },
                  { n: '3', icon: <svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Test link sent by email', sub: 'Candidate receives their personalised assessment automatically' },
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
                <div className="cam-submissions-meta">
                  <span>{submissions.length} application{submissions.length !== 1 ? 's' : ''}</span>
                  <button className="cam-refresh-btn" onClick={loadSubmissions}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Refresh
                  </button>
                </div>
                <div className="cam-list">
                  {submissions.map(app => {
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
