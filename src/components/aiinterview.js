import React, { useState } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import HTMLRenderer from 'react-html-renderer'

// Set the workerSrc property
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const AIInterview = () => {
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [interviewLink, setInterviewLink] = useState("");
  const [popupVisible, setPopupVisible] = useState(false);

  const handleFileChange = (e, type) => {
   //console.log("handleFileChange");
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      if (type === 'jobDescription') {
        setJobDescriptionFile(file);
        extractTextFromPDF(file, setJobDescriptionText);
      } else if (type === 'resume') {
        setResumeFile(file);
        extractTextFromPDF(file, setResumeText);
      }
    } else {
      alert('Please upload a valid PDF file.');
    }
  };

  const extractTextFromPDF = async (file, setTextCallback) => {
   //console.log("extractTextFromPDF");
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
   //console.log(fullText);
   setTextCallback(fullText);
   return fullText;
   };

  const uploadFile = async (file, type) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await axios.post('/api/upload-to-s3', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!jobDescriptionFile || !resumeFile) {
      alert('Please select both Job Description and Resume files before uploading.');
      return;
    }

    try {
      setUploadStatus('Uploading files...');
      const jobDescriptionUpload = uploadFile(jobDescriptionFile, 'jobDescription');
      const resumeUpload = uploadFile(resumeFile, 'resume');

      await Promise.all([jobDescriptionUpload, resumeUpload]);
      setUploadStatus('Files uploaded successfully!');
      //console.log('Job Description Text:', jobDescriptionText);
      //console.log('Resume Text:', resumeText);
    } catch (error) {
      setUploadStatus('Error uploading files. Please try again.');
    }
  };

  const generateReport = async () => {
   if (!jobDescriptionText) {
     alert("Please upload the job description.");
     return;
   }

   if (!resumeText) {
      alert("Please upload the candidate's resume.");
      return;
    }

   setIsGenerating(true);
   try {
     const response = await fetch("https://api.openai.com/v1/chat/completions", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer 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`,
       },
       body: JSON.stringify({
         model: "gpt-4o-mini",
                 messages: [
                       {
                          role: 'system',
                          content: 'You are a helpful assistant who can check the job description and candidates profile and provide a HTML report on suitabelity'
                       },
                       {
                          role: 'user',
                          content: `Check the job description and candidates profile and provide a Text report on suitabelity:\n\n 
                          Candidates Profile: ${resumeText}.\n\n                           
                          Job Description: ${jobDescriptionText}\n\n
                          Candidate Name:\n
                          Summary:\n
                          Provide a Suitabelity %.:\n
                          Skills and Experience Match:\n
                          Skills not Matching:\n
                          Additional Strengths:\n
                          Conclusion:\n
                          \n
                          Provide only the BODY of the HTML, no header, no sufix and prefix.\n
                          `
                       }
                    ],
         max_tokens: 2000,
         temperature: 0.7,
       }),
     });

     const data = await response.json();
     //console.log(data);
     setReport(data.choices[0].message.content);
   } catch (error) {
     //console.error(error);
     alert("Error generating suitabelity report.");
   } finally {
     setIsGenerating(false);
   }
 };
 
  const handleCopyToClipboard = (templateID) => {
    if (templateID) {
      const url = `https://www.hrrobots.click/interviewPage/${templateID}`;
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setPopupVisible(true);
          setTimeout(() => setPopupVisible(false), 6000); // Hide popup after 6 seconds
        })
        .catch((err) => {
          console.error("Clipboard write failed: ", err);
          setMessage("Failed to copy the URL to the clipboard. Please try again.");
        });
    }
  };

  return (
    <div className="app">
      {popupVisible && (
        <div className="banner-popup">
          <p>The test URL has been successfully copied to your clipboard. Kindly paste it into an email and send it to the candidate.</p>
          <p>https://www.hrrobots.click/interviewPage/123</p>
          <p>{message}</p>
        </div>
      )}
      <div className="container" style={{ marginTop: '70px' }}>
        <div className="card" style={{ width: '40%' }}>
          <h3>Upload Job Description</h3>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileChange(e, 'jobDescription')}
            style={{ width: '95%' }}
          />
        </div>
        <div className="card" style={{ width: '40%' }}>
          <h3>Upload Resume</h3>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileChange(e, 'resume')}
            style={{ width: '95%' }}
          />
        </div>
         {message && <><p>{message}</p><br/></>}
         <button onClick={() => handleCopyToClipboard("123")} disabled={isGenerating}>
            {!interviewLink ? <> {isGenerating ? "Generating..." : "Generate Questions (Pro)"} </>:<>Copy to Clipboard</>}
         </button>
         </div>
    </div>
  );
};

export default AIInterview;
