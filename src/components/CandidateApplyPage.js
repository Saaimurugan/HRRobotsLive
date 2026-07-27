import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import '../candidateApply.css';

const API = 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/candidateApply';

// ── Step constants ────────────────────────────────────────────────────────────
const STEP_FORM    = 'form';     // Step 1: fill name/email/phone, upload PDF
const STEP_PARSING = 'parsing';  // Intermediate: Nova extracting resume
const STEP_REVIEW  = 'review';   // Step 2: candidate reviews / edits extracted data
const STEP_SUCCESS = 'success';  // Step 3: submitted successfully

const CandidateApplyPage = () => {
  const { templateId } = useParams();
  const fileInputRef = useRef(null);

  const [templateInfo, setTemplateInfo] = useState(null);
  const [infoLoading, setInfoLoading]   = useState(true);
  const [infoError, setInfoError]       = useState('');

  // Step 1 state
  const [step, setStep]             = useState(STEP_FORM);
  const [form, setForm]             = useState({ name: '', email: '', phone: '' });
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Step 2 state – editable parsed data
  const [parsedData, setParsedData]   = useState(null);
  const [parseError, setParseError]   = useState('');

  // Step 3 / submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Load template info ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getInfo', templateID: templateId }),
        });
        const data = await res.json();
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

  // ── PDF extraction ───────────────────────────────────────────────────────────
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
      const text = pages.join(' ');
      setResumeText(text);

      return text;
    } catch (err) {
      console.error('PDF extraction error:', err);
      setResumeText('');
      return '';
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFieldErrors((p) => ({ ...p, resume: 'Only PDF files are accepted.' }));
      return;
    }
    setFieldErrors((p) => ({ ...p, resume: '' }));
    setResumeFile(file);
    await extractPDF(file);
  };

  // ── Step 1 validation ───────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = 'Full name is required.';
    if (!form.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!resumeFile) errs.resume = 'Please upload your resume (PDF).';
    return errs;
  };

  // ── Step 1 → Step 2: parse resume with Amazon Nova ──────────────────────────
  const handleAnalyse = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setParseError('');
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setStep(STEP_PARSING);

    try {
      const textToSend = resumeText || '';
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parseResume', resumeText: textToSend }),
      });
      const data = await res.json();
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;

      if (data.statusCode === 200 || res.ok) {
        const pd = parsed.parsed || {};
        // Pre-fill name/email/phone from form if Nova didn't extract them
        setParsedData({
          fullName:        pd.fullName        || form.name,
          email:           pd.email           || form.email,
          phone:           pd.phone           || form.phone,
          location:        pd.location        || '',
          linkedin:        pd.linkedin        || '',
          currentTitle:    pd.currentTitle    || '',
          totalExperience: pd.totalExperience || '',
          summary:         pd.summary         || '',
          skills:          Array.isArray(pd.skills)         ? pd.skills         : [],
          experience:      Array.isArray(pd.experience)     ? pd.experience     : [],
          education:       Array.isArray(pd.education)      ? pd.education      : [],
          certifications:  Array.isArray(pd.certifications) ? pd.certifications : [],
          languages:       Array.isArray(pd.languages)      ? pd.languages      : [],
        });
        setStep(STEP_REVIEW);
      } else {
        setParseError(parsed.error || 'Failed to analyse resume. You can still submit manually.');
        setStep(STEP_REVIEW);
        // Give a blank template so review step still renders
        setParsedData({
          fullName: form.name, email: form.email, phone: form.phone,
          location: '', linkedin: '', currentTitle: '', totalExperience: '',
          summary: '', skills: [], experience: [], education: [],
          certifications: [], languages: [],
        });
      }
    } catch {
      setParseError('Network error during resume analysis. You can still submit manually.');
      setStep(STEP_REVIEW);
      setParsedData({
        fullName: form.name, email: form.email, phone: form.phone,
        location: '', linkedin: '', currentTitle: '', totalExperience: '',
        summary: '', skills: [], experience: [], education: [],
        certifications: [], languages: [],
      });
    }
  };

  // ── Helpers for review step editable fields ──────────────────────────────────
  const updateParsed = (key, value) =>
    setParsedData((p) => ({ ...p, [key]: value }));

  const updateSkill = (i, val) =>
    setParsedData((p) => {
      const skills = [...p.skills];
      skills[i] = val;
      return { ...p, skills };
    });

  const removeSkill = (i) =>
    setParsedData((p) => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }));

  const addSkill = () =>
    setParsedData((p) => ({ ...p, skills: [...p.skills, ''] }));

  const updateExp = (i, key, val) =>
    setParsedData((p) => {
      const experience = p.experience.map((exp, idx) =>
        idx === i ? { ...exp, [key]: val } : exp
      );
      return { ...p, experience };
    });

  const removeExp = (i) =>
    setParsedData((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));

  const addExp = () =>
    setParsedData((p) => ({
      ...p,
      experience: [...p.experience, { title: '', company: '', duration: '', description: '' }],
    }));

  const updateEdu = (i, key, val) =>
    setParsedData((p) => {
      const education = p.education.map((edu, idx) =>
        idx === i ? { ...edu, [key]: val } : edu
      );
      return { ...p, education };
    });

  const removeEdu = (i) =>
    setParsedData((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addEdu = () =>
    setParsedData((p) => ({
      ...p,
      education: [...p.education, { degree: '', institution: '', year: '' }],
    }));

  const updateListItem = (field, i, val) =>
    setParsedData((p) => {
      const arr = [...p[field]];
      arr[i] = val;
      return { ...p, [field]: arr };
    });

  const removeListItem = (field, i) =>
    setParsedData((p) => ({ ...p, [field]: p[field].filter((_, idx) => idx !== i) }));

  const addListItem = (field) =>
    setParsedData((p) => ({ ...p, [field]: [...p[field], ''] }));

  // ── Step 2 → Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      // Use reviewed/edited data as the authoritative candidate info
      const candidateName  = (parsedData.fullName  || form.name).trim();
      const candidateEmail = (parsedData.email      || form.email).trim().toLowerCase();
      const candidatePhone = (parsedData.phone      || form.phone).trim();

      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:        'submit',
          templateID:    templateId,
          candidateName,
          candidateEmail,
          candidatePhone,
          resumeText:    resumeText.slice(0, 15000), // cap at ~15KB to stay under DynamoDB 400KB item limit
          parsedResume:  parsedData,  // Save full structured data to DynamoDB
        }),
      });
      const data   = await res.json();
      const parsed = typeof data.body === 'string' ? JSON.parse(data.body) : data.body || data;
      const statusCode = data.statusCode || (res.ok ? 200 : 500);
      if (statusCode === 200) {
        setStep(STEP_SUCCESS);
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

  // ────────────────────────────────────────────────────────────────────────────
  // ── RENDER: loading / error / success ───────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────
  if (infoLoading)
    return (
      <div className="apply-page apply-page--center">
        <div className="apply-spinner" aria-label="Loading" />
      </div>
    );

  if (infoError)
    return (
      <div className="apply-page apply-page--center">
        <div className="apply-error-card">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>{infoError}</p>
        </div>
      </div>
    );

  if (step === STEP_SUCCESS)
    return (
      <div className="apply-page apply-page--center">
        <div className="apply-success-card">
          <div className="apply-success-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="22 4 12 14.01 9 11.01" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>Application Submitted!</h2>
          <p>
            Thank you, <strong>{parsedData?.fullName || form.name}</strong>. Your resume has been
            reviewed and an assessment link has been sent to{' '}
            <strong>{parsedData?.email || form.email}</strong>.
          </p>
          <p className="apply-success-note">
            Please check your inbox (and spam folder) for your personalised test link.
          </p>
        </div>
      </div>
    );

  const roleLine = templateInfo?.role ? (
    <span className="apply-hero-role">{templateInfo.role}</span>
  ) : null;

  // ────────────────────────────────────────────────────────────────────────────
  // ── RENDER: parsing spinner ──────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────
  if (step === STEP_PARSING)
    return (
      <div className="apply-page apply-page--center">
        <div className="apply-parsing-card">
          <div className="apply-parsing-icon">
            <div className="apply-spinner" aria-hidden="true" />
          </div>
          <h2>Analysing Your Resume</h2>
          <p>HRRobots is reading your resume and extracting your information. This takes a few seconds…</p>
          <div className="apply-parsing-steps">
            <span className="apply-parsing-step apply-parsing-step--done">✓ Resume uploaded</span>
            <span className="apply-parsing-step apply-parsing-step--active">⟳ Extracting details with AI</span>
            <span className="apply-parsing-step">○ Review &amp; confirm</span>
            <span className="apply-parsing-step">○ Submit</span>
          </div>
        </div>
      </div>
    );

  // ────────────────────────────────────────────────────────────────────────────
  // ── RENDER: Step 1 — upload form ────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────
  if (step === STEP_FORM)
    return (
      <div className="apply-page">
        <div className="apply-card">
          <div className="apply-card-header">
            <div className="apply-logo">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="apply-hero-title">{templateInfo?.templateName || 'Job Application'}</h1>
            {roleLine}
            <p className="apply-hero-sub">
              Fill in your details and upload your resume. Our AI will review your profile and send you a personalised assessment link.
            </p>
          </div>

          <form className="apply-form" onSubmit={handleAnalyse} noValidate>
            {/* Name */}
            <div className={`apply-field ${fieldErrors.name ? 'has-error' : ''}`}>
              <label htmlFor="apply-name">Full Name *</label>
              <div className="apply-input-wrap">
                <svg className="apply-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                </svg>
                <input id="apply-name" type="text" placeholder="Jane Smith" value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoComplete="name" />
              </div>
              {fieldErrors.name && <span className="apply-field-error">{fieldErrors.name}</span>}
            </div>

            {/* Email */}
            <div className={`apply-field ${fieldErrors.email ? 'has-error' : ''}`}>
              <label htmlFor="apply-email">Email Address *</label>
              <div className="apply-input-wrap">
                <svg className="apply-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input id="apply-email" type="email" placeholder="jane@example.com" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} autoComplete="email" />
              </div>
              {fieldErrors.email && <span className="apply-field-error">{fieldErrors.email}</span>}
            </div>

            {/* Phone */}
            <div className="apply-field">
              <label htmlFor="apply-phone">Phone Number</label>
              <div className="apply-input-wrap">
                <svg className="apply-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6 6l.96-1.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input id="apply-phone" type="tel" placeholder="+1 555 000 0000" value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} autoComplete="tel" />
              </div>
            </div>


            {/* Resume upload */}
            <div className={`apply-field ${fieldErrors.resume ? 'has-error' : ''}`}>
              <label>Resume / CV (PDF) *</label>
              <div
                className={`apply-drop-zone ${resumeFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) { fileInputRef.current.files = e.dataTransfer.files; handleFileChange({ target: { files: [f] } }); }
                }}
                role="button" tabIndex={0} aria-label="Upload resume PDF"
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                {extracting ? (
                  <><div className="apply-spinner apply-spinner--sm" aria-hidden="true" /><span>Reading resume…</span></>
                ) : resumeFile ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="22 4 12 14.01 9 11.01" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{resumeFile.name}</span>
                    <small>Click to replace</small>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Click or drag &amp; drop your PDF here</span>
                    <small>PDF only · Max 10 MB</small>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} aria-hidden="true" />
              </div>
              {fieldErrors.resume && <span className="apply-field-error">{fieldErrors.resume}</span>}
            </div>

            <button type="submit" className="apply-submit-btn" disabled={extracting}>
              {extracting ? (
                <><div className="apply-spinner apply-spinner--sm apply-spinner--white" aria-hidden="true" /> Reading PDF…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Analyse Resume with AI
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

  // ────────────────────────────────────────────────────────────────────────────
  // ── RENDER: Step 2 — review extracted data ──────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="apply-page">
      <div className="apply-card apply-card--wide">
        {/* Header */}
        <div className="apply-card-header">
          <div className="apply-logo">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="apply-hero-title">{templateInfo?.templateName || 'Job Application'}</h1>
          {roleLine}
          <p className="apply-hero-sub">
            HRRobots has extracted your information. Review, edit if needed, then submit.
          </p>
        </div>

        {/* AI notice or error */}
        {parseError ? (
          <div className="apply-review-notice apply-review-notice--warn">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {parseError} Please fill in the details manually below.
          </div>
        ) : (
          <div className="apply-review-notice apply-review-notice--success">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            HRRobots has pre-filled your details from your resume. Please review and correct anything before submitting.
          </div>
        )}

        <form className="apply-form apply-review-form" onSubmit={handleSubmit} noValidate>

          {/* ── Section: Personal Details ─────────────────────────────────── */}
          <div className="apply-review-section">
            <h3 className="apply-review-section-title">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
              </svg>
              Personal Details
            </h3>
            <div className="apply-review-grid">
              <div className="apply-field">
                <label>Full Name *</label>
                <input type="text" value={parsedData.fullName} onChange={(e) => updateParsed('fullName', e.target.value)} required />
              </div>
              <div className="apply-field">
                <label>Email Address *</label>
                <input type="email" value={parsedData.email} onChange={(e) => updateParsed('email', e.target.value)} required />
              </div>
              <div className="apply-field">
                <label>Phone Number</label>
                <input type="tel" value={parsedData.phone} onChange={(e) => updateParsed('phone', e.target.value)} />
              </div>
              <div className="apply-field">
                <label>Location</label>
                <input type="text" placeholder="City, Country" value={parsedData.location} onChange={(e) => updateParsed('location', e.target.value)} />
              </div>
              <div className="apply-field">
                <label>Current / Most Recent Title</label>
                <input type="text" placeholder="e.g. Software Engineer" value={parsedData.currentTitle} onChange={(e) => updateParsed('currentTitle', e.target.value)} />
              </div>
              <div className="apply-field">
                <label>Total Experience</label>
                <input type="text" placeholder="e.g. 3 years" value={parsedData.totalExperience} onChange={(e) => updateParsed('totalExperience', e.target.value)} />
              </div>
              <div className="apply-field">
                <label>LinkedIn</label>
                <input type="text" placeholder="linkedin.com/in/yourprofile" value={parsedData.linkedin} onChange={(e) => updateParsed('linkedin', e.target.value)} />
              </div>
            </div>
            <div className="apply-field" style={{ marginTop: '12px' }}>
              <label>Professional Summary</label>
              <textarea rows={3} value={parsedData.summary} onChange={(e) => updateParsed('summary', e.target.value)} placeholder="Brief overview of your professional background…" />
            </div>
          </div>


          {/* ── Section: Skills ───────────────────────────────────────────── */}
          <div className="apply-review-section">
            <h3 className="apply-review-section-title">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Skills
            </h3>
            <div className="apply-tag-list">
              {parsedData.skills.map((sk, i) => (
                <div key={i} className="apply-tag-item">
                  <input type="text" value={sk} onChange={(e) => updateSkill(i, e.target.value)} placeholder="Skill" />
                  <button type="button" className="apply-tag-remove" onClick={() => removeSkill(i)} aria-label="Remove skill">×</button>
                </div>
              ))}
              <button type="button" className="apply-tag-add" onClick={addSkill}>+ Add Skill</button>
            </div>
          </div>

          {/* ── Section: Experience ───────────────────────────────────────── */}
          <div className="apply-review-section">
            <h3 className="apply-review-section-title">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Work Experience
            </h3>
            {parsedData.experience.map((exp, i) => (
              <div key={i} className="apply-review-entry">
                <button type="button" className="apply-entry-remove" onClick={() => removeExp(i)} aria-label="Remove experience">×</button>
                <div className="apply-review-grid apply-review-grid--3">
                  <div className="apply-field">
                    <label>Job Title</label>
                    <input type="text" value={exp.title} onChange={(e) => updateExp(i, 'title', e.target.value)} placeholder="e.g. Software Engineer" />
                  </div>
                  <div className="apply-field">
                    <label>Company</label>
                    <input type="text" value={exp.company} onChange={(e) => updateExp(i, 'company', e.target.value)} placeholder="Company name" />
                  </div>
                  <div className="apply-field">
                    <label>Duration</label>
                    <input type="text" value={exp.duration} onChange={(e) => updateExp(i, 'duration', e.target.value)} placeholder="Jan 2022 – Present" />
                  </div>
                </div>
                <div className="apply-field" style={{ marginTop: '8px' }}>
                  <label>Description</label>
                  <textarea rows={2} value={exp.description} onChange={(e) => updateExp(i, 'description', e.target.value)} placeholder="Brief description of responsibilities…" />
                </div>
              </div>
            ))}
            <button type="button" className="apply-entry-add" onClick={addExp}>+ Add Experience</button>
          </div>

          {/* ── Section: Education ────────────────────────────────────────── */}
          <div className="apply-review-section">
            <h3 className="apply-review-section-title">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Education
            </h3>
            {parsedData.education.map((edu, i) => (
              <div key={i} className="apply-review-entry">
                <button type="button" className="apply-entry-remove" onClick={() => removeEdu(i)} aria-label="Remove education">×</button>
                <div className="apply-review-grid apply-review-grid--3">
                  <div className="apply-field">
                    <label>Degree</label>
                    <input type="text" value={edu.degree} onChange={(e) => updateEdu(i, 'degree', e.target.value)} placeholder="e.g. B.Sc. Computer Science" />
                  </div>
                  <div className="apply-field">
                    <label>Institution</label>
                    <input type="text" value={edu.institution} onChange={(e) => updateEdu(i, 'institution', e.target.value)} placeholder="University name" />
                  </div>
                  <div className="apply-field">
                    <label>Year / Duration</label>
                    <input type="text" value={edu.year} onChange={(e) => updateEdu(i, 'year', e.target.value)} placeholder="e.g. 2020" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="apply-entry-add" onClick={addEdu}>+ Add Education</button>
          </div>


          {/* ── Section: Certifications & Languages ───────────────────────── */}
          <div className="apply-review-grid apply-review-grid--2col-sections">
            <div className="apply-review-section">
              <h3 className="apply-review-section-title">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Certifications
              </h3>
              <div className="apply-tag-list">
                {parsedData.certifications.map((cert, i) => (
                  <div key={i} className="apply-tag-item">
                    <input type="text" value={cert} onChange={(e) => updateListItem('certifications', i, e.target.value)} placeholder="Certification" />
                    <button type="button" className="apply-tag-remove" onClick={() => removeListItem('certifications', i)} aria-label="Remove">×</button>
                  </div>
                ))}
                <button type="button" className="apply-tag-add" onClick={() => addListItem('certifications')}>+ Add</button>
              </div>
            </div>

            <div className="apply-review-section">
              <h3 className="apply-review-section-title">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Languages
              </h3>
              <div className="apply-tag-list">
                {parsedData.languages.map((lang, i) => (
                  <div key={i} className="apply-tag-item">
                    <input type="text" value={lang} onChange={(e) => updateListItem('languages', i, e.target.value)} placeholder="Language" />
                    <button type="button" className="apply-tag-remove" onClick={() => removeListItem('languages', i)} aria-label="Remove">×</button>
                  </div>
                ))}
                <button type="button" className="apply-tag-add" onClick={() => addListItem('languages')}>+ Add</button>
              </div>
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <div className="apply-submit-error" role="alert">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {submitError}
            </div>
          )}

          {/* Actions */}
          <div className="apply-review-actions">
            <button
              type="button"
              className="apply-back-btn"
              onClick={() => setStep(STEP_FORM)}
              disabled={submitting}
            >
              ← Back
            </button>
            <button type="submit" className="apply-submit-btn" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? (
                <><div className="apply-spinner apply-spinner--sm apply-spinner--white" aria-hidden="true" /> Submitting…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Confirm &amp; Submit Application
                </>
              )}
            </button>
          </div>

          <p className="apply-privacy-note">
            Your information is used only for this application. We will send your assessment link to the email you provide.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CandidateApplyPage;
