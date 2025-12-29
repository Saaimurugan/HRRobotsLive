import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalContext } from "../globalContext";
import '../createJD.css';

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

const CreateJD = () => {
   const navigate = useNavigate();
   const location = useLocation();
   const { globalValue, JWTValue, setRedirectPath, logout } = useGlobalContext();
   const [toasts, setToasts] = useState([]);
   const [formData, setFormData] = useState({
      roleName: '',
      yearsOfExperience: '',
      projectDetails: '',
      languages: '',
      additionalSkills: '',
   });

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

   const [jobDescription, setJobDescription] = useState('');
   const [loading, setLoading] = useState(false);
   const [showForm, setShowForm] = useState(true);

   const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
         const response = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/generatejd', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...formData, token: JWTValue }),
         });

         if (!response.ok) {
            throw new Error('Failed to generate job description');
         }

         const data = await response.json();
         if (checkUnauthorized(data)) {
            setLoading(false);
            return;
         }
         // Parse the body - it may be a JSON string that needs parsing
         let parsedBody = data.body;
         if (typeof parsedBody === 'string') {
            try {
               parsedBody = JSON.parse(parsedBody);
            } catch {
               // body is already a string (HTML content)
            }
         }
         // Extract the HTML content from the response
         let htmlContent = typeof parsedBody === 'object' && parsedBody.content 
            ? parsedBody.content 
            : (typeof parsedBody === 'string' ? parsedBody : '');
         
         // Clean up AI response artifacts - extract only the HTML between tags
         // Remove intro text like "Sure, here is..." and markdown code blocks
         htmlContent = htmlContent
            .replace(/^[\s\S]*?```html\s*/i, '')  // Remove everything before ```html
            .replace(/```[\s\S]*$/i, '')           // Remove ``` and everything after
            .replace(/^[\s\S]*?(?=<!DOCTYPE|<html|<body|<div|<h1|<h2|<p|<ul|<ol)/i, '') // Remove intro text
            .replace(/This HTML job description[\s\S]*$/i, '') // Remove trailing explanation
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
            .replace(/body\s*\{[^}]*\}/gi, '') // Remove body CSS rules
            .replace(/[a-z0-9,\s]+\{[^}]*\}/gi, '') // Remove any remaining CSS rules
            .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '') // Remove title tags
            .trim();
         
         setJobDescription(htmlContent);
         setShowForm(false);
      } catch (error) {
         //console.error('Error generating job description:', error);
         alert('Failed to generate job description. Please try again.');
      } finally {
         setLoading(false);
      }
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
          h3 {
            color: #4a5568;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 1.25rem 0 0.5rem 0;
          }
          p {
            margin: 0.75rem 0;
            text-align: justify;
          }
          ul, ol {
            padding-left: 28px;
            margin: 0.75rem 0;
          }
          li {
            margin-bottom: 10px;
          }
          strong, b {
            color: #2d3748;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
          }
          th, td {
            padding: 12px 15px;
            text-align: left;
            border: 1px solid #e2e8f0;
          }
          th {
            background: #f8fafc;
            font-weight: 600;
            color: #2d3748;
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
          <head>
            <title>Job Description - ${formData.roleName || 'HR Robots'}</title>
            ${styles}
          </head>
          <body>
            ${printableContent.innerHTML}
            <div class="footer">Powered by HR Robots | www.hrrobots.com</div>
          </body>
        </html>
      `);
      const images = printWindow.document.images;
      const totalImages = images.length;
      let loadedImages = 0;
  
      if (totalImages === 0) {
         printWindow.document.close();
         printWindow.print();
      } else {
         for (let img of images) {
            img.onload = () => {
               loadedImages++;
               if (loadedImages === totalImages) {
                  printWindow.document.close();
                  printWindow.print();
               }
            };
            img.onerror = () => {
               loadedImages++;
               if (loadedImages === totalImages) {
                  printWindow.document.close();
                  printWindow.print();
               }
            };
         }
      }
   };

   return (
      <div className="create-jd-page">
         <Toast toasts={toasts} removeToast={removeToast} />
         {showForm ? (
         <div className="create-jd-form-container">
            <div className="create-jd-header">
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
               <h1>Create Job Description</h1>
            </div>
            <form className="create-jd-form" onSubmit={handleSubmit}>
               <div className="form-group">
                  <label>Role Name *</label>
                  <input
                     type="text"
                     name="roleName"
                     value={formData.roleName}
                     onChange={handleChange}
                     placeholder="e.g., Senior Software Engineer"
                     required
                  />
               </div>
               <div className="form-group">
                  <label>Years of Experience *</label>
                  <input
                     type="number"
                     name="yearsOfExperience"
                     value={formData.yearsOfExperience}
                     onChange={handleChange}
                     placeholder="e.g., 5"
                     min="0"
                     max="40"
                     step="0.1"
                     required
                  />
               </div>
               <div className="form-group">
                  <label>Project Details</label>
                  <textarea
                     name="projectDetails"
                     value={formData.projectDetails}
                     onChange={handleChange}
                     placeholder="Describe the project or team context..."
                  />
               </div>
               <div className="form-group">
                  <label>Programming Languages *</label>
                  <input
                     type="text"
                     name="languages"
                     value={formData.languages}
                     onChange={handleChange}
                     placeholder="e.g., JavaScript, Python, Java"
                     required
                  />
               </div>
               <div className="form-group">
                  <label>Additional Skills *</label>
                  <input
                     type="text"
                     name="additionalSkills"
                     value={formData.additionalSkills}
                     onChange={handleChange}
                     placeholder="e.g., AWS, Docker, Agile"
                     required
                  />
               </div>
               <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
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
                        Generate Job Description
                     </>
                  )}
               </button>
            </form>
         </div>
         ) : (
         <div className="create-jd-header">
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
            <h1>Generated Job Description</h1>
            <button className="print-btn" onClick={handlePrint}>
               <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
               Print
            </button>
         </div>
         )}

         {jobDescription && (
            <div className="jd-result-container">
               <div id="printableContent" className="jd-content">
                  <div dangerouslySetInnerHTML={{ __html: jobDescription }} />
               </div>
            </div>
         )}
      </div>
   );
};

export default CreateJD;
