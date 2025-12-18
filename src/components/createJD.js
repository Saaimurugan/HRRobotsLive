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
         const htmlContent = data.body.match(/<[^>]+>/g)?.join('') || '';
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
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          #printableContent {
            text-align: left;
            background-color: #fff;
            padding: 10px;
            border: 1px solid #ebccd1;
            border-radius: 5px;
            margin: 20px auto;
            max-width: 900px;
          }
          h1, p {
            color: #007bff;
          }
        </style>
      `;
      printWindow.document.write(`
        <html>
          <head>
            <title>Job Description</title>
            ${styles}
          </head>
          <body>${printableContent.innerHTML}<p style="text-align: center">Powered by HR Robots | www.hrrobots.com</p></body>
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
                  {loading ? 'Generating...' : 'Generate Job Description'}
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
