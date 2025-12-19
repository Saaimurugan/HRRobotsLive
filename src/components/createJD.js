import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../createJD.css';

const CreateJD = () => {
   const navigate = useNavigate();
   const [formData, setFormData] = useState({
      roleName: '',
      yearsOfExperience: '',
      projectDetails: '',
      languages: '',
      additionalSkills: '',
   });

   const [jobDescription, setJobDescription] = useState('');
   const [loading, setLoading] = useState(false);

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
            body: JSON.stringify(formData),
         });

         if (!response.ok) {
            throw new Error('Failed to generate job description');
         }

         const data = await response.json();
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
            .trim();
         
         setJobDescription(htmlContent);
      } catch (error) {
         console.error('Error generating job description:', error);
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

         {jobDescription && (
            <div className="jd-result-container">
               <h2>Generated Job Description</h2>
               <div id="printableContent" className="jd-content">
                  <div dangerouslySetInnerHTML={{ __html: jobDescription }} />
               </div>
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
      </div>
   );
};

export default CreateJD;
