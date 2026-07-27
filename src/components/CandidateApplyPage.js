import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import '../candidateApply.css';

const API = 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/candidateApply';

const CandidateApplyPage = () => {
  const { templateId } = useParams();
  const fileInputRef = useRef(null);

  const [templateInfo, setTemplateInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeBase64, setResumeBase64] = useState('');
  const [extracting, setExtracting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Load template info ───────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getInfo', templateID: templateId }),
        });
        const data = await res.json();
        // Lambda wraps response in body string
        const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
        if (data.statusCode === 200 || res.ok) {
          setTemplateInfo(parsed);
        } else {
          setInfoError('Could not load job information. Please check the link and try again.');
        }
      } catch {
        setInfoError('Could not load job information. Please check the link and try again.');
      } finally {
        setInfoLoading(false);
      }
    };
    if (templateId) load();
  }, [templateId]);

  // ── PDF extraction (dynamic import to avoid bundle-time crash) ───────────
  const extractPDF = async (file) => {
    setExtracting(true);
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
      setResumeText(pages.join(' '));

      // Also store base64 for record keeping
      const reader = new FileReader();
      reader.onload = (e) => setResumeBase64(e.target.result.split(',')[1] || '');
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('PDF extraction error:', err);
      setResumeText('');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFieldErrors((p) => ({ ...p, resume: 'Only PDF files are accepted.' }));
      return;
    }
    setFieldErrors((p) => ({ ...p, resume: '' }));
    setResumeFile(file);
    extractPDF(file);
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required.';
    if (!form.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!resumeFile) errs.resume = 'Please upload your resume (PDF).';
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          templateID: templateId,
          candidateName: form.name.trim(),
          candidateEmail: form.email.trim().toLowerCase(),
          candidatePhone: form.phone.trim(),
          resumeText,
          resumeBase64,
        }),
      });
      const data = await res.json();
      // API Gateway always returns HTTP 200; statusCode is in the body
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
      const statusCode = data.statusCode || (res.ok ? 200 : 500);
      if (statusCode === 200) {
        setSubmitted(true);
      } else if (statusCode === 409) {
        setSubmitError(parsed.error || 'You have already applied for this position.');
      } else {
        setSubmitError(parsed.error || 'Submission failed. Please try again.');
      }
    } catch {
      setSubmitError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render: loading ───────────────────────────────────────────────────────
  if (infoLoading) return (
    <div className="apply-page apply-page--center">
      <div className="apply-spinner" aria-label="Loading" />
    </div>
  );

  if (infoError) return (
    <div className="apply-page apply-page--center">
      <div className="apply-error-card">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/></svg>
        <p>{infoError}</p>
      </div>
    </div>
  );

  // ── Render: success ───────────────────────────────────────────────────────
  if (submitted) return (
    <div className="apply-page apply-page--center">
      <div className="apply-success-card">
        <div className="apply-success-icon">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22 4 12 14.01 9 11.01" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>Application Submitted!</h2>
        <p>Thank you, <strong>{form.name}</strong>. Your resume has been reviewed and an assessment link has been sent to <strong>{form.email}</strong>.</p>
        <p className="apply-success-note">Please check your inbox (and spam folder) for your personalised test link.</p>
      </div>
    </div>
  );

  // ── Render: form ──────────────────────────────────────────────────────────
  const roleLine = templateInfo?.role
    ? <span className="apply-hero-role">{templateInfo.role}</span>
    : null;

  return (
    <div className="apply-page">
      <div className="apply-card">
        {/* Header */}
        <div className="apply-card-header">
          <div className="apply-logo">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="apply-hero-title">{templateInfo?.templateName || 'Job Application'}</h1>
          {roleLine}
          <p className="apply-hero-sub">Fill in your details and upload your resume. Our AI will review your profile and send you a personalised assessment link.</p>
        </div>

        {/* Form */}
        <form className="apply-form" onSubmit={handleSubmit} noValidate>
          <div className={`apply-field ${fieldErrors.name ? 'has-error' : ''}`}>
            <label htmlFor="apply-name">Full Name *</label>
            <div className="apply-input-wrap">
              <svg className="apply-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input id="apply-name" type="text" placeholder="Jane Smith" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoComplete="name"/>
            </div>
            {fieldErrors.name && <span className="apply-field-error">{fieldErrors.name}</span>}
          </div>

          <div className={`apply-field ${fieldErrors.email ? 'has-error' : ''}`}>
            <label htmlFor="apply-email">Email Address *</label>
            <div className="apply-input-wrap">
              <svg className="apply-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input id="apply-email" type="email" placeholder="jane@example.com" value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} autoComplete="email"/>
            </div>
            {fieldErrors.email && <span className="apply-field-error">{fieldErrors.email}</span>}
          </div>

          <div className="apply-field">
            <label htmlFor="apply-phone">Phone Number</label>
            <div className="apply-input-wrap">
              <svg className="apply-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-1.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input id="apply-phone" type="tel" placeholder="+1 555 000 0000" value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} autoComplete="tel"/>
            </div>
          </div>

          <div className={`apply-field ${fieldErrors.resume ? 'has-error' : ''}`}>
            <label>Resume / CV (PDF) *</label>
            <div
              className={`apply-drop-zone ${resumeFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileInputRef.current.files = e.dataTransfer.files; handleFileChange({ target: { files: [f] } }); } }}
              role="button" tabIndex={0} aria-label="Upload resume PDF"
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {extracting ? (
                <><div className="apply-spinner apply-spinner--sm" aria-hidden="true"/><span>Reading resume…</span></>
              ) : resumeFile ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>{resumeFile.name}</span>
                  <small>Click to replace</small>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Click or drag &amp; drop your PDF here</span>
                  <small>PDF only · Max 10 MB</small>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} aria-hidden="true"/>
            </div>
            {fieldErrors.resume && <span className="apply-field-error">{fieldErrors.resume}</span>}
          </div>

          {submitError && (
            <div className="apply-submit-error" role="alert">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/></svg>
              {submitError}
            </div>
          )}

          <button type="submit" className="apply-submit-btn" disabled={submitting || extracting}>
            {submitting ? (
              <><div className="apply-spinner apply-spinner--sm apply-spinner--white" aria-hidden="true"/> Submitting…</>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Submit Application
              </>
            )}
          </button>

          <p className="apply-privacy-note">
            Your information is used only for this application. We will send your assessment link to the email you provide.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CandidateApplyPage;
