import React, { useState } from 'react';
import '../App.css';

const CreateJD = () => {
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
         // Extract only the HTML content from the response
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
    // Wait for all images to load before printing
    const images = printWindow.document.images;
    const totalImages = images.length;
    let loadedImages = 0;
  
    if (totalImages === 0) {
      // If there are no images, print immediately
      printWindow.document.close();
      printWindow.print();
    } else {
      // Add load event listener to each image
      for (let img of images) {
        img.onload = () => {
          loadedImages++;
          if (loadedImages === totalImages) {
            // All images are loaded, print the document
            printWindow.document.close();
            printWindow.print();
          }
        };
        img.onerror = () => {
          // Handle image load errors (optional)
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
      <div className="containerLogin">
         <div className="login-container">
         <h1>Create Job Description</h1>
         <form onSubmit={handleSubmit}>
            <div className="form-group">
               <label>Role Name:*</label>
               <input
                  type="text"
                  name="roleName"
                  value={formData.roleName}
                  onChange={handleChange}
                  required
               />
            </div>
            <div className="form-group">
               <label>Years of Experience:*</label>
               <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleChange}
                  min="0"
                  max="40"
                  step="0.1"
                  required
               />
            </div>
            <div className="form-group">
               <label>Project Details:</label>
               <textarea
                  name="projectDetails"
                  value={formData.projectDetails}
                  onChange={handleChange}
               />
            </div>
            <div className="form-group">
               <label>Programming Languages:*</label>
               <input
                  type="text"
                  name="languages"
                  value={formData.languages}
                  onChange={handleChange}
                  required
               />
            </div>
            <div className="form-group">
               <label>Additional Skills:*</label>
               <input
                  type="text"
                  name="additionalSkills"
                  value={formData.additionalSkills}
                  onChange={handleChange}
                  required
               />
            </div>
            <button type="submit" disabled={loading}>
               {loading ? 'Generating...' : 'Generate JD'}
            </button>
         </form>
      </div>
      {jobDescription && (
         <div className="containerLogin">
            <div className="jd-container">
            <div id="printableContent">
               <div
                  className="analytics-content"
                  dangerouslySetInnerHTML={{ __html: jobDescription }}
               />
            <button onClick={handlePrint}>
            Print
            </button>
            </div>
            </div>
            </div>
         )}
      </div>
   );
};

export default CreateJD;