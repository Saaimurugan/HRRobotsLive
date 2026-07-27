import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../generateResume.css';

// API endpoint — update after deploying the Lambda + API Gateway
const API_ENDPOINT = 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/generateResume';

// ── Default entry shapes ───────────────────────────────────────────────────
const emptyExperience = () => ({
   id: Date.now() + Math.random(),
   title: '',
   company: '',
   location: '',
   startDate: '',
   endDate: '',
   current: false,
   description: '',
});

const emptyEducation = () => ({
   id: Date.now() + Math.random(),
   degree: '',
   institution: '',
   location: '',
   startDate: '',
   endDate: '',
   gpa: '',
   notes: '',
});

// Toast Component
const Toast = ({ toasts, removeToast }) => (
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
               <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
         </div>
      ))}
   </div>
);

// ── Design option cards with visual previews ──────────────────────────────
const DESIGN_OPTIONS = [
   {
      id: 'classic',
      label: 'Classic',
      description: 'Traditional, ATS-friendly',
      preview: (
         <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="design-preview-svg">
            {/* Page background */}
            <rect width="120" height="160" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
            {/* Name header */}
            <rect x="10" y="10" width="70" height="7" rx="1.5" fill="#1e293b"/>
            <rect x="10" y="20" width="45" height="4" rx="1" fill="#94a3b8"/>
            {/* Divider */}
            <line x1="10" y1="30" x2="110" y2="30" stroke="#cbd5e1" strokeWidth="1"/>
            {/* Section: Experience */}
            <rect x="10" y="36" width="30" height="4" rx="1" fill="#2563eb"/>
            <line x1="10" y1="43" x2="110" y2="43" stroke="#e2e8f0" strokeWidth="0.75"/>
            <rect x="10" y="47" width="55" height="3" rx="1" fill="#475569"/>
            <rect x="10" y="53" width="40" height="2.5" rx="1" fill="#94a3b8"/>
            <rect x="14" y="58" width="80" height="2" rx="1" fill="#cbd5e1"/>
            <rect x="14" y="62" width="70" height="2" rx="1" fill="#cbd5e1"/>
            <rect x="14" y="66" width="75" height="2" rx="1" fill="#cbd5e1"/>
            {/* Second job */}
            <rect x="10" y="73" width="50" height="3" rx="1" fill="#475569"/>
            <rect x="10" y="79" width="38" height="2.5" rx="1" fill="#94a3b8"/>
            <rect x="14" y="84" width="78" height="2" rx="1" fill="#cbd5e1"/>
            <rect x="14" y="88" width="65" height="2" rx="1" fill="#cbd5e1"/>
            {/* Section: Education */}
            <rect x="10" y="96" width="28" height="4" rx="1" fill="#2563eb"/>
            <line x1="10" y1="103" x2="110" y2="103" stroke="#e2e8f0" strokeWidth="0.75"/>
            <rect x="10" y="107" width="52" height="3" rx="1" fill="#475569"/>
            <rect x="10" y="113" width="36" height="2.5" rx="1" fill="#94a3b8"/>
            {/* Section: Skills */}
            <rect x="10" y="121" width="20" height="4" rx="1" fill="#2563eb"/>
            <line x1="10" y1="128" x2="110" y2="128" stroke="#e2e8f0" strokeWidth="0.75"/>
            <rect x="10" y="132" width="95" height="2" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="136" width="80" height="2" rx="1" fill="#cbd5e1"/>
         </svg>
      ),
   },
   {
      id: 'modern',
      label: 'Modern',
      description: 'Two-column layout',
      preview: (
         <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="design-preview-svg">
            <rect width="120" height="160" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
            {/* Left sidebar */}
            <rect width="38" height="160" rx="3" fill="#1e3a5f"/>
            {/* Sidebar: avatar circle */}
            <circle cx="19" cy="22" r="11" fill="#2563eb" opacity="0.7"/>
            {/* Sidebar: name */}
            <rect x="5" y="37" width="28" height="3.5" rx="1" fill="#ffffff" opacity="0.9"/>
            <rect x="8" y="43" width="22" height="2.5" rx="1" fill="#93c5fd" opacity="0.8"/>
            {/* Sidebar divider */}
            <line x1="5" y1="50" x2="33" y2="50" stroke="#3b82f6" strokeWidth="0.75" opacity="0.6"/>
            {/* Sidebar: contact */}
            <rect x="5" y="54" width="15" height="2.5" rx="1" fill="#93c5fd" opacity="0.7"/>
            <rect x="5" y="59" width="28" height="2" rx="1" fill="#cbd5e1" opacity="0.5"/>
            <rect x="5" y="63" width="24" height="2" rx="1" fill="#cbd5e1" opacity="0.5"/>
            <rect x="5" y="67" width="26" height="2" rx="1" fill="#cbd5e1" opacity="0.5"/>
            {/* Sidebar: skills */}
            <rect x="5" y="75" width="15" height="2.5" rx="1" fill="#93c5fd" opacity="0.7"/>
            <rect x="5" y="80" width="28" height="2" rx="1" fill="#cbd5e1" opacity="0.4"/>
            <rect x="5" y="84" width="22" height="2" rx="1" fill="#cbd5e1" opacity="0.4"/>
            <rect x="5" y="88" width="26" height="2" rx="1" fill="#cbd5e1" opacity="0.4"/>
            <rect x="5" y="92" width="20" height="2" rx="1" fill="#cbd5e1" opacity="0.4"/>
            {/* Right content */}
            <rect x="44" y="12" width="35" height="5" rx="1" fill="#1e293b"/>
            <rect x="44" y="20" width="25" height="3" rx="1" fill="#94a3b8"/>
            <line x1="44" y1="27" x2="114" y2="27" stroke="#e2e8f0" strokeWidth="0.75"/>
            <rect x="44" y="31" width="22" height="3.5" rx="1" fill="#2563eb"/>
            <rect x="44" y="38" width="45" height="2.5" rx="1" fill="#475569"/>
            <rect x="44" y="43" width="33" height="2" rx="1" fill="#94a3b8"/>
            <rect x="44" y="47" width="65" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="44" y="51" width="58" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="44" y="55" width="62" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="44" y="62" width="45" height="2.5" rx="1" fill="#475569"/>
            <rect x="44" y="67" width="33" height="2" rx="1" fill="#94a3b8"/>
            <rect x="44" y="71" width="60" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="44" y="75" width="55" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="44" y="82" width="22" height="3.5" rx="1" fill="#2563eb"/>
            <rect x="44" y="89" width="45" height="2.5" rx="1" fill="#475569"/>
            <rect x="44" y="94" width="55" height="1.5" rx="1" fill="#cbd5e1"/>
         </svg>
      ),
   },
   {
      id: 'creative',
      label: 'Creative',
      description: 'Bold header, skill badges',
      preview: (
         <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="design-preview-svg">
            <rect width="120" height="160" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
            {/* Teal header banner */}
            <rect width="120" height="44" rx="3" fill="#0d9488"/>
            <rect x="0" y="41" width="120" height="3" fill="#0d9488"/>
            {/* Name in header */}
            <rect x="10" y="10" width="60" height="7" rx="1.5" fill="#ffffff"/>
            <rect x="10" y="20" width="40" height="3.5" rx="1" fill="#99f6e4" opacity="0.9"/>
            <rect x="10" y="27" width="55" height="2.5" rx="1" fill="#5eead4" opacity="0.7"/>
            {/* Contact pills in header */}
            <rect x="10" y="35" width="22" height="5" rx="2.5" fill="#0f766e"/>
            <rect x="35" y="35" width="22" height="5" rx="2.5" fill="#0f766e"/>
            <rect x="60" y="35" width="22" height="5" rx="2.5" fill="#0f766e"/>
            {/* Skills as badges */}
            <rect x="10" y="52" width="20" height="6" rx="3" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.75"/>
            <rect x="33" y="52" width="24" height="6" rx="3" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.75"/>
            <rect x="60" y="52" width="18" height="6" rx="3" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.75"/>
            <rect x="81" y="52" width="22" height="6" rx="3" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.75"/>
            <rect x="10" y="61" width="16" height="6" rx="3" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.75"/>
            <rect x="29" y="61" width="26" height="6" rx="3" fill="#ccfbf1" stroke="#0d9488" strokeWidth="0.75"/>
            {/* Experience section */}
            <rect x="10" y="75" width="28" height="4" rx="1" fill="#0d9488"/>
            <rect x="10" y="82" width="50" height="3" rx="1" fill="#475569"/>
            <rect x="10" y="88" width="35" height="2" rx="1" fill="#94a3b8"/>
            <rect x="10" y="93" width="90" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="97" width="82" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="101" width="86" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="108" width="50" height="3" rx="1" fill="#475569"/>
            <rect x="10" y="114" width="35" height="2" rx="1" fill="#94a3b8"/>
            <rect x="10" y="119" width="88" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="123" width="75" height="1.5" rx="1" fill="#cbd5e1"/>
            {/* Education */}
            <rect x="10" y="131" width="24" height="4" rx="1" fill="#0d9488"/>
            <rect x="10" y="138" width="55" height="2.5" rx="1" fill="#475569"/>
            <rect x="10" y="143" width="38" height="2" rx="1" fill="#94a3b8"/>
         </svg>
      ),
   },
   {
      id: 'minimal',
      label: 'Minimal',
      description: 'Clean whitespace, typography',
      preview: (
         <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="design-preview-svg">
            <rect width="120" height="160" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
            {/* Large name — typographic focus */}
            <rect x="12" y="14" width="75" height="9" rx="1.5" fill="#111827"/>
            <rect x="12" y="26" width="48" height="4" rx="1" fill="#6b7280"/>
            {/* Thin rule */}
            <line x1="12" y1="35" x2="108" y2="35" stroke="#d1d5db" strokeWidth="0.75"/>
            {/* Contact line */}
            <rect x="12" y="39" width="90" height="2" rx="1" fill="#9ca3af"/>
            {/* Thin rule */}
            <line x1="12" y1="45" x2="108" y2="45" stroke="#d1d5db" strokeWidth="0.75"/>
            {/* Experience heading — all caps, small */}
            <rect x="12" y="50" width="22" height="2.5" rx="1" fill="#374151"/>
            <rect x="12" y="56" width="52" height="3" rx="1" fill="#111827"/>
            <rect x="12" y="62" width="35" height="2" rx="1" fill="#9ca3af"/>
            <rect x="12" y="67" width="88" height="1.5" rx="1" fill="#d1d5db"/>
            <rect x="12" y="71" width="80" height="1.5" rx="1" fill="#d1d5db"/>
            <rect x="12" y="75" width="84" height="1.5" rx="1" fill="#d1d5db"/>
            <rect x="12" y="81" width="50" height="3" rx="1" fill="#111827"/>
            <rect x="12" y="87" width="33" height="2" rx="1" fill="#9ca3af"/>
            <rect x="12" y="92" width="85" height="1.5" rx="1" fill="#d1d5db"/>
            <rect x="12" y="96" width="70" height="1.5" rx="1" fill="#d1d5db"/>
            {/* Thin rule */}
            <line x1="12" y1="103" x2="108" y2="103" stroke="#d1d5db" strokeWidth="0.75"/>
            {/* Education */}
            <rect x="12" y="108" width="20" height="2.5" rx="1" fill="#374151"/>
            <rect x="12" y="114" width="55" height="3" rx="1" fill="#111827"/>
            <rect x="12" y="120" width="35" height="2" rx="1" fill="#9ca3af"/>
            {/* Thin rule */}
            <line x1="12" y1="127" x2="108" y2="127" stroke="#d1d5db" strokeWidth="0.75"/>
            {/* Skills */}
            <rect x="12" y="132" width="16" height="2.5" rx="1" fill="#374151"/>
            <rect x="12" y="138" width="90" height="1.5" rx="1" fill="#d1d5db"/>
            <rect x="12" y="142" width="72" height="1.5" rx="1" fill="#d1d5db"/>
         </svg>
      ),
   },
   {
      id: 'executive',
      label: 'Executive',
      description: 'Leadership & impact focus',
      preview: (
         <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="design-preview-svg">
            <rect width="120" height="160" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1"/>
            {/* Dark navy header */}
            <rect width="120" height="38" rx="3" fill="#1e3a5f"/>
            <rect x="0" y="35" width="120" height="3" fill="#1e3a5f"/>
            {/* Gold accent bar */}
            <rect x="0" y="35" width="120" height="3" fill="#c9a84c"/>
            {/* Name */}
            <rect x="10" y="9" width="65" height="8" rx="1.5" fill="#ffffff"/>
            <rect x="10" y="20" width="42" height="3.5" rx="1" fill="#93c5fd" opacity="0.85"/>
            <rect x="10" y="27" width="70" height="2" rx="1" fill="#64748b" opacity="0.6"/>
            {/* Executive Summary */}
            <rect x="10" y="44" width="35" height="4" rx="1" fill="#1e3a5f"/>
            <rect x="10" y="51" width="98" height="2" rx="1" fill="#475569"/>
            <rect x="10" y="55" width="92" height="2" rx="1" fill="#475569"/>
            <rect x="10" y="59" width="80" height="2" rx="1" fill="#475569"/>
            {/* Key achievements */}
            <rect x="10" y="67" width="32" height="4" rx="1" fill="#1e3a5f"/>
            {/* Achievement boxes */}
            <rect x="10" y="74" width="28" height="18" rx="2" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.75"/>
            <rect x="13" y="77" width="22" height="6" rx="1" fill="#2563eb" opacity="0.8"/>
            <rect x="13" y="86" width="18" height="2" rx="1" fill="#94a3b8"/>
            <rect x="43" y="74" width="28" height="18" rx="2" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.75"/>
            <rect x="46" y="77" width="22" height="6" rx="1" fill="#2563eb" opacity="0.8"/>
            <rect x="46" y="86" width="18" height="2" rx="1" fill="#94a3b8"/>
            <rect x="76" y="74" width="34" height="18" rx="2" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="0.75"/>
            <rect x="79" y="77" width="28" height="6" rx="1" fill="#2563eb" opacity="0.8"/>
            <rect x="79" y="86" width="20" height="2" rx="1" fill="#94a3b8"/>
            {/* Experience */}
            <rect x="10" y="97" width="30" height="4" rx="1" fill="#1e3a5f"/>
            <line x1="10" y1="104" x2="110" y2="104" stroke="#e2e8f0" strokeWidth="0.75"/>
            <rect x="10" y="107" width="55" height="3" rx="1" fill="#334155"/>
            <rect x="10" y="113" width="38" height="2" rx="1" fill="#94a3b8"/>
            <rect x="10" y="118" width="92" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="122" width="85" height="1.5" rx="1" fill="#cbd5e1"/>
            <rect x="10" y="126" width="88" height="1.5" rx="1" fill="#cbd5e1"/>
            {/* Education */}
            <rect x="10" y="134" width="24" height="4" rx="1" fill="#1e3a5f"/>
            <line x1="10" y1="141" x2="110" y2="141" stroke="#e2e8f0" strokeWidth="0.75"/>
            <rect x="10" y="144" width="55" height="2.5" rx="1" fill="#334155"/>
            <rect x="10" y="149" width="38" height="2" rx="1" fill="#94a3b8"/>
         </svg>
      ),
   },
];

const GenerateResume = () => {
   const navigate = useNavigate();

   const [toasts, setToasts] = useState([]);
   const [loading, setLoading] = useState(false);
   const [resumeHtml, setResumeHtml] = useState('');
   const [showForm, setShowForm] = useState(true);
   const [selectedDesign, setSelectedDesign] = useState('classic');

   const [formData, setFormData] = useState({
      fullName: 'Sarah Mitchell',
      email: 'sarah.mitchell@email.com',
      phone: '+1 (555) 234-5678',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/sarahmitchell',
      website: 'https://sarahmitchell.dev',
      summary: 'Results-driven Senior Software Engineer with 8+ years of experience building scalable web applications and leading cross-functional engineering teams. Passionate about clean architecture, developer experience, and delivering impactful products.',
      skills: 'Python, JavaScript, TypeScript, React, Node.js, AWS (EC2, Lambda, S3, RDS), Docker, Kubernetes, PostgreSQL, Redis, GraphQL, REST APIs, CI/CD, Terraform',
      certifications: 'AWS Certified Solutions Architect – Associate (2023), Google Cloud Professional Data Engineer (2022)',
      languages: 'English (Native), French (Conversational)',
      achievements: 'Engineering Excellence Award – Acme Corp (2023), Speaker at ReactConf 2022, Open source contributor (2.4k GitHub stars)',
   });

   // Structured lists
   const [experiences, setExperiences] = useState([
      {
         id: 1,
         title: 'Senior Software Engineer',
         company: 'Acme Corp',
         location: 'San Francisco, CA',
         startDate: 'Mar 2021',
         endDate: '',
         current: true,
         description: '- Led a team of 6 engineers to redesign the core payments platform, reducing transaction failures by 35%\n- Architected a microservices migration from a monolith, improving deployment frequency from monthly to daily\n- Mentored 4 junior engineers through structured code reviews and pair programming sessions\n- Reduced AWS infrastructure costs by $120k/year through right-sizing and spot instance adoption',
      },
      {
         id: 2,
         title: 'Software Engineer',
         company: 'StartupXYZ',
         location: 'Austin, TX',
         startDate: 'Jun 2018',
         endDate: 'Feb 2021',
         current: false,
         description: '- Built the real-time analytics dashboard used by 500+ enterprise clients using React and WebSockets\n- Developed RESTful APIs in Node.js handling 2M+ requests/day\n- Implemented automated testing suite increasing code coverage from 40% to 88%\n- Collaborated with product and design to ship 3 major feature releases on schedule',
      },
      {
         id: 3,
         title: 'Junior Developer',
         company: 'Digital Agency Co.',
         location: 'Austin, TX',
         startDate: 'Jan 2017',
         endDate: 'May 2018',
         current: false,
         description: '- Delivered 12 client websites using React, Vue.js, and WordPress\n- Integrated third-party APIs including Stripe, Twilio, and Google Maps\n- Participated in daily standups and biweekly sprint reviews in an Agile environment',
      },
   ]);

   const [educations, setEducations] = useState([
      {
         id: 1,
         degree: 'B.Sc. Computer Science',
         institution: 'University of Texas at Austin',
         location: 'Austin, TX',
         startDate: '2013',
         endDate: '2017',
         gpa: '3.8 / 4.0',
         notes: "Dean's List (2015–2017), Thesis: Distributed Caching Strategies for High-Throughput Systems",
      },
   ]);

   // ── Toast helpers ──────────────────────────────────────────────────────────
   const showToast = useCallback((type, title, message) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, type, title, message }]);
      setTimeout(() => {
         setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
         setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
      }, 4000);
   }, []);

   const removeToast = (id) => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
   };

   const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
   };

   // ── Experience helpers ─────────────────────────────────────────────────────
   const addExperience = () => setExperiences(prev => [...prev, emptyExperience()]);
   const removeExperience = (id) => setExperiences(prev => prev.filter(e => e.id !== id));
   const updateExperience = (id, field, value) =>
      setExperiences(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

   // ── Education helpers ──────────────────────────────────────────────────────
   const addEducation = () => setEducations(prev => [...prev, emptyEducation()]);
   const removeEducation = (id) => setEducations(prev => prev.filter(e => e.id !== id));
   const updateEducation = (id, field, value) =>
      setEducations(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

   // ── Serialize arrays to readable text for the AI prompt ───────────────────
   const serializeExperiences = () =>
      experiences
         .filter(e => e.title || e.company)
         .map(e => {
            const period = e.current
               ? `${e.startDate} – Present`
               : `${e.startDate}${e.endDate ? ' – ' + e.endDate : ''}`;
            const header = [e.title, e.company, e.location, period].filter(Boolean).join(' | ');
            return `${header}\n${e.description || ''}`.trim();
         })
         .join('\n\n');

   const serializeEducations = () =>
      educations
         .filter(e => e.degree || e.institution)
         .map(e => {
            const period = `${e.startDate}${e.endDate ? ' – ' + e.endDate : ''}`;
            const header = [e.degree, e.institution, e.location, period].filter(Boolean).join(' | ');
            const extras = [e.gpa ? `GPA: ${e.gpa}` : '', e.notes].filter(Boolean).join(' · ');
            return `${header}${extras ? '\n' + extras : ''}`.trim();
         })
         .join('\n\n');

   // ── Submit ─────────────────────────────────────────────────────────────────
   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.fullName.trim() || !formData.email.trim()) {
         showToast('warning', 'Missing Fields', 'Full name and email are required.');
         return;
      }
      setLoading(true);
      try {
         const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               ...formData,
               experience: serializeExperiences(),
               education: serializeEducations(),
               design: selectedDesign,
            }),
         });

         if (!response.ok) throw new Error('Network response was not ok');

         const data = await response.json();

         // Parse body if it's a JSON string
         let parsed = data;
         if (typeof data.body === 'string') {
            try { parsed = JSON.parse(data.body); } catch { parsed = data; }
         } else if (data.body) {
            parsed = data.body;
         }

         let html = parsed.resumeHtml || '';

         // Strip any residual markdown code fences
         html = html
            .replace(/^[\s\S]*?```html\s*/i, '')
            .replace(/```[\s\S]*$/i, '')
            .trim();

         if (!html) throw new Error('Empty resume returned from server.');

         setResumeHtml(html);
         setShowForm(false);
         showToast('success', 'Resume Generated!', 'Your resume is ready. Click "Save as Word" to download.');
      } catch (error) {
         showToast('error', 'Generation Failed', error.message || 'Please try again.');
      } finally {
         setLoading(false);
      }
   };

   // ── Save as Word (.doc) ───────────────────────────────────────────────────
   const handleSaveWord = () => {
      const printableContent = document.getElementById('resumePrintable');
      if (!printableContent) return;

      // Word-compatible HTML using MHTML content type that Word/LibreOffice recognises
      const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <meta name=ProgId content=Word.Document>
  <meta name=Generator content='Microsoft Word 15'>
  <meta name=Originator content='Microsoft Word 15'>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom>
  <w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: .5in;
      mso-footer-margin: .5in;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: Calibri, Arial, sans-serif;
      font-size: 11pt;
      color: #374151;
      line-height: 1.5;
    }
    h1 { font-size: 22pt; color: #1e293b; margin-bottom: 4pt; }
    h2 { font-size: 13pt; color: #2563eb; margin-top: 14pt; margin-bottom: 4pt; border-bottom: 1pt solid #2563eb; padding-bottom: 2pt; }
    h3 { font-size: 11pt; color: #1e293b; margin-top: 8pt; margin-bottom: 2pt; }
    p  { margin: 4pt 0; }
    ul { margin: 4pt 0 4pt 18pt; }
    li { margin-bottom: 3pt; }
    a  { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="Section1">
    ${printableContent.innerHTML}
  </div>
</body>
</html>`;

      const blob = new Blob(['\ufeff', wordHtml], {
         type: 'application/msword',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resume_${(formData.fullName || 'Resume').replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('success', 'Download started', 'Your resume is downloading as a Word document.');
   };

   // ── Render: Form ──────────────────────────────────────────────────────────
   const renderForm = () => (
      <div className="resume-form-container">
         <div className="resume-form-header">
            <button onClick={() => navigate('/login')} className="modern-button--outline" title="Back to Login">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
               </svg>
            </button>
            <h1>AI Resume Builder</h1>
         </div>

         <form className="resume-form" onSubmit={handleSubmit}>
            {/* ── Design picker ── */}
            <div className="resume-section-title">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
               </svg>
               Choose a Design
            </div>
            <div className="design-picker">
               {DESIGN_OPTIONS.map(opt => (
                  <button
                     type="button"
                     key={opt.id}
                     className={`design-card ${selectedDesign === opt.id ? 'selected' : ''}`}
                     onClick={() => setSelectedDesign(opt.id)}
                  >
                     <div className="design-card-preview">{opt.preview}</div>
                     <div className="design-card-label">{opt.label}</div>
                     <div className="design-card-desc">{opt.description}</div>
                  </button>
               ))}
            </div>

            {/* ── Personal Info ── */}
            <div className="resume-section-title">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
               </svg>
               Personal Information
            </div>
            <div className="form-grid">
               <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g., Jane Smith" required/>
               </div>
               <div className="form-group">
                  <label>Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="jane@example.com" required/>
               </div>
               <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 555 000 0000"/>
               </div>
               <div className="form-group">
                  <label>Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="City, Country"/>
               </div>
               <div className="form-group">
                  <label>LinkedIn URL</label>
                  <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/..."/>
               </div>
               <div className="form-group">
                  <label>Website / Portfolio</label>
                  <input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://yoursite.com"/>
               </div>
            </div>

            {/* ── Professional Summary ── */}
            <div className="resume-section-title">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
               </svg>
               Professional Summary
            </div>
            <div className="form-group full-width">
               <label>Summary</label>
               <textarea name="summary" value={formData.summary} onChange={handleChange} placeholder="A brief 2–4 sentence overview of your professional background, key strengths, and career goals..."/>
            </div>

            {/* ── Work Experience ── */}
            <div className="resume-section-title">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
               </svg>
               Work Experience
            </div>

            {experiences.map((exp, idx) => (
               <div key={exp.id} className="entry-card">
                  <div className="entry-card-header">
                     <span className="entry-card-index">Position {idx + 1}</span>
                     {experiences.length > 1 && (
                        <button type="button" className="entry-remove-btn" onClick={() => removeExperience(exp.id)} aria-label="Remove this position">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                           </svg>
                        </button>
                     )}
                  </div>
                  <div className="form-grid">
                     <div className="form-group">
                        <label>Job Title</label>
                        <input type="text" value={exp.title} onChange={e => updateExperience(exp.id, 'title', e.target.value)} placeholder="e.g., Senior Software Engineer"/>
                     </div>
                     <div className="form-group">
                        <label>Company</label>
                        <input type="text" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} placeholder="e.g., Acme Corp"/>
                     </div>
                     <div className="form-group">
                        <label>Location</label>
                        <input type="text" value={exp.location} onChange={e => updateExperience(exp.id, 'location', e.target.value)} placeholder="e.g., New York, NY"/>
                     </div>
                     <div className="form-group">
                        <label>Start Date</label>
                        <input type="text" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} placeholder="e.g., Jan 2021"/>
                     </div>
                     <div className="form-group">
                        <label>End Date</label>
                        <input type="text" value={exp.endDate} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} placeholder="e.g., Dec 2023" disabled={exp.current}/>
                     </div>
                     <div className="form-group form-group--checkbox">
                        <label className="checkbox-label">
                           <input type="checkbox" checked={exp.current} onChange={e => updateExperience(exp.id, 'current', e.target.checked)}/>
                           Currently working here
                        </label>
                     </div>
                  </div>
                  <div className="form-group full-width" style={{marginTop: '8px'}}>
                     <label>Key Responsibilities & Achievements</label>
                     <textarea value={exp.description} onChange={e => updateExperience(exp.id, 'description', e.target.value)}
                        placeholder={"- Led a team of 5 engineers to deliver...\n- Reduced API latency by 40%\n- Built CI/CD pipeline using GitHub Actions"}
                        rows={4}/>
                  </div>
               </div>
            ))}

            <button type="button" className="entry-add-btn" onClick={addExperience}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
               </svg>
               Add Another Position
            </button>

            {/* ── Education ── */}
            <div className="resume-section-title">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
               </svg>
               Education
            </div>

            {educations.map((edu, idx) => (
               <div key={edu.id} className="entry-card">
                  <div className="entry-card-header">
                     <span className="entry-card-index">Qualification {idx + 1}</span>
                     {educations.length > 1 && (
                        <button type="button" className="entry-remove-btn" onClick={() => removeEducation(edu.id)} aria-label="Remove this qualification">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                           </svg>
                        </button>
                     )}
                  </div>
                  <div className="form-grid">
                     <div className="form-group">
                        <label>Degree / Qualification</label>
                        <input type="text" value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} placeholder="e.g., B.Sc. Computer Science"/>
                     </div>
                     <div className="form-group">
                        <label>Institution</label>
                        <input type="text" value={edu.institution} onChange={e => updateEducation(edu.id, 'institution', e.target.value)} placeholder="e.g., MIT"/>
                     </div>
                     <div className="form-group">
                        <label>Location</label>
                        <input type="text" value={edu.location} onChange={e => updateEducation(edu.id, 'location', e.target.value)} placeholder="e.g., Cambridge, MA"/>
                     </div>
                     <div className="form-group">
                        <label>Start Year</label>
                        <input type="text" value={edu.startDate} onChange={e => updateEducation(edu.id, 'startDate', e.target.value)} placeholder="e.g., 2014"/>
                     </div>
                     <div className="form-group">
                        <label>End Year</label>
                        <input type="text" value={edu.endDate} onChange={e => updateEducation(edu.id, 'endDate', e.target.value)} placeholder="e.g., 2018"/>
                     </div>
                     <div className="form-group">
                        <label>GPA / Grade (optional)</label>
                        <input type="text" value={edu.gpa} onChange={e => updateEducation(edu.id, 'gpa', e.target.value)} placeholder="e.g., 3.8 / 4.0"/>
                     </div>
                  </div>
                  <div className="form-group full-width" style={{marginTop: '8px'}}>
                     <label>Additional Notes (optional)</label>
                     <textarea value={edu.notes} onChange={e => updateEducation(edu.id, 'notes', e.target.value)}
                        placeholder="e.g., Dean's List, Thesis: Machine Learning in Healthcare, Relevant coursework..."
                        rows={2}/>
                  </div>
               </div>
            ))}

            <button type="button" className="entry-add-btn" onClick={addEducation}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
               </svg>
               Add Another Qualification
            </button>

            {/* ── Skills & Extras ── */}
            <div className="resume-section-title">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
               </svg>
               Skills & Additional Details
            </div>
            <div className="form-grid">
               <div className="form-group">
                  <label>Technical Skills</label>
                  <textarea name="skills" value={formData.skills} onChange={handleChange} placeholder="e.g., Python, React, AWS, Docker, SQL" rows={3}/>
               </div>
               <div className="form-group">
                  <label>Certifications</label>
                  <textarea name="certifications" value={formData.certifications} onChange={handleChange} placeholder="e.g., AWS Solutions Architect, PMP, CISSP" rows={3}/>
               </div>
               <div className="form-group">
                  <label>Languages</label>
                  <input type="text" name="languages" value={formData.languages} onChange={handleChange} placeholder="e.g., English (Native), Spanish (Fluent)"/>
               </div>
               <div className="form-group">
                  <label>Achievements / Awards</label>
                  <textarea name="achievements" value={formData.achievements} onChange={handleChange} placeholder="e.g., Employee of the Year 2023, Hackathon Winner" rows={3}/>
               </div>
            </div>

            <button type="submit" className="resume-submit-btn" disabled={loading}>
               {loading ? (
                  <>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                     </svg>
                     Generating Your Resume...
                  </>
               ) : (
                  <>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                     </svg>
                     Generate Resume with AI
                  </>
               )}
            </button>
         </form>
      </div>
   );

   // ── Render: Result ────────────────────────────────────────────────────────
   const renderResult = () => (
      <>
         <div className="resume-result-header">
            <button onClick={() => setShowForm(true)} className="modern-button--outline" title="Back to form">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
               </svg>
               Edit
            </button>
            <h1>Your Resume — {formData.fullName}</h1>
            <div className="resume-action-btns">
               <button className="resume-redesign-btn" onClick={() => setShowForm(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Change Design
               </button>
               <button className="print-btn" onClick={handleSaveWord}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                     <polyline points="14 2 14 8 20 8"/>
                     <path d="M8 13h2.5M8 17h5"/>
                     <path d="M10 13v4"/>
                  </svg>
                  Save as Word
               </button>
            </div>
         </div>
         <div className="resume-output-container">
            <div id="resumePrintable" className="resume-output">
               <div dangerouslySetInnerHTML={{ __html: resumeHtml }} />
            </div>
         </div>
      </>
   );

   // ── Main render ────────────────────────────────────────────────────────────
   return (
      <div className="generate-resume-page">
         <Toast toasts={toasts} removeToast={removeToast} />
         {showForm ? renderForm() : renderResult()}
      </div>
   );
};

export default GenerateResume;
