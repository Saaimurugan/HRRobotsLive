import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import HTMLRenderer from 'react-html-renderer'
import "../App.css";
import { GlobalProvider, useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";
import ProfileReport from "./profileReport";

// Set the workerSrc property
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const ProfilerPage = () => {
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { globalValue, setGlobalValue } = useGlobalContext("");
  const navigate = useNavigate();

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
    // }else{console.log(globalValue);}
  }, [globalValue, navigate]);

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
   // console.log("extractTextFromPDF");
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
      //console.error('Error uploading file:', error);
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
          padding: 5px;
          border: 1px solid #ebccd1;
          border-radius: 5px;
          margin: 5px auto;
          max-width: 900px;
        }
        h1, p {
          color:rgb(13, 13, 13);
        }
      </style>
    `;
    printWindow.document.write(`
      <html>
        <head>
          <title>HR ROBOTS Candidate Profiler Report</title>
          ${styles}
        </head>
        ${printableContent.innerHTML}<p style="text-align: center">Powered by HR Robots | www.hrrobots.com</p></body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const autoFixJSON = (fileContent) => {
    try {
        // Remove Markdown backticks (```json or ```)
        fileContent = fileContent.replace(/```(json)?/g, '').trim();

        //console.log('HTML file fixed successfully.');
        return fileContent
    } catch (error) {
        console.error('Error auto-fixing JSON:', error.message);
    }
  }

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
     const response = await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/matchJDResume", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({ jobDescription: jobDescriptionText, resume: resumeText })
      });
      const data = await response.json();
 
      // Parse the JSON string inside the "body"
      const parsedBody = JSON.parse(data.body);
      
      // Extract the "data" object
      const responceContent = parsedBody.data;
      
      //console.log(responceContent);
      setReport(responceContent);
  


     // setReport(autoFixJSON(data.choices[0].message.content));
   } catch (error) {
     console.error(error);
     alert("Error generating suitabelity report.");
   } finally {
     setIsGenerating(false);
   }
 };
 
  return (
    <div className="app">
      <h2 style={{ padding:"10px",marginTop:"70px"}}>Candidate Profiler</h2>
      <div className="container" style={{ marginTop: '70px' }}>
        <div className="card">
          <h3>Upload Job Description</h3>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileChange(e, 'jobDescription')}
            style={{ width: '95%' }}
          />
        </div>
        <div className="card">
          <h3>Upload Resume</h3>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleFileChange(e, 'resume')}
            style={{ width: '95%' }}
          />
        </div>
        </div>
        <button 
          onClick={generateReport} 
          disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Suitability Report"}
        </button>

        {report&&
         <>
            <div id="printableContent">
            <ProfileReport report={report} />
            </div>
            <button style={{marginTop:"20px"}} onClick={handlePrint}>
                Print
            </button>
         </>
        }
    </div>
  );
};

export default ProfilerPage;
