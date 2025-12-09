import React, { useState, useEffect } from "react";
import { GlobalProvider, useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";
import DisplayMessage from "./displayMessage";
import ListTestResultPage from "./listTestResultPage"
import ScoreChart from "./scoreChart";
import PhotoCatolog from "./photoCatolog";
import AnalsticsOnResult from "./analsticsOnResult";

function SearchResult() {
  const [searchTerm, setSearchTerm] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const {globalValue, setGlobalValue } = useGlobalContext("");
  const navigate = useNavigate();

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    }
    //else{console.log(globalValue);}
  }, [globalValue, navigate]);

  const handleSearch = async () => {
      if (!searchTerm) {
        // Extract UUID using JavaScript's String.split() method
        setMessage("Please paste the test ID or test URL.");
      }
      else
      {
        const searchUUID = searchTerm.split('/').pop();
        setFileContent("");
        // console.log(searchUUID);
        try {
          setLoading(true);
          const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({ searchTerm: searchUUID }),
          });

          const data = await response.json();

          // setFileContent(JSON.stringify(data.body));
          if (data.statusCode === 200) {
                const parsedBody = JSON.parse(data.body);
                setFileContent(parsedBody); 

                //const parsedBody = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
                //setFileContent(parsedBody);

                setMessage(data.message);
          }else if (data.statusCode === 404) {
              setMessage(data.body);
          } else {
              setMessage(data.body);
          }
        } catch (error) {
            setMessage("An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
      }
  };

  const handleBack = () => {
    setFileContent("");
    setSearchTerm("");
    setMessage("");
  }

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
          <title>Print Results</title>
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

/*   function HtmlRenderer({ fileContent }) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: fileContent }}
      />
    );
  } */

  return (
    <div className="app">
            <h2 style={{ padding:"10px",marginTop:"70px"}}>Result</h2>
              {!fileContent &&
              <div style={{ padding:"10px", justifyContent:"center" }}>
              <input
                type="text"
                placeholder="Test ID or URL"
                value={searchTerm}
                style={{ width: "70%" }}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={handleSearch} disabled={loading}>
              {loading?"loading...":"Check"}
            </button>
            </div>
              }
              {fileContent ? (
              <div className="container">
              <div className="form-group" style={{width: "-webkit-fill-available"}}>
              <div id="printableContent">
              <div
              style={{
                maxWidth: "600px",
                margin: "20px auto",
                background: "#fff",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                border: "1px solid #eaeaea",
              }}
            >
              <div
                style={{
                  background: "#2575fc",
                  color: "#fff",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "24px", color: "whitesmoke" }}>Assessment Test Report</h2>
              </div>
              <div style={{ padding: "20px" }}>
                <h2 style={{ fontSize: "20px", marginBottom: "10px" }}>
                  Test ID: {fileContent.testID}
                </h2>
                <div>
                <ScoreChart message={fileContent}/>
                <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderBottom: "1px solid #eaeaea",
                    }}
                  >
                    <span>Candidate Name:</span>
                    <span>{fileContent.candidateName}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderBottom: "1px solid #eaeaea",
                    }}
                  >
                    <span>Total Questions:</span>
                    <span>{fileContent.totalQuestions}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderBottom: "1px solid #eaeaea",
                    }}
                  >
                    <span>Attempted Questions:</span>
                    <span>{fileContent.submittedAnswers}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px",
                    }}
                  >
                    <span>Correct Answers:</span>
                    <span>{fileContent.correctAnswers}</span>
                  </div>
                </div>
                <PhotoCatolog searchTerm={searchTerm}/>
              </div>
              </div>
                  </div>
                  <div style={{ padding: "10px", display: "flex", justifyContent: "space-between" }}>

                  <button onClick={handlePrint}>
              Print
            </button>
              <button onClick={handleBack} disabled={loading}>
                {loading?"loading...":"Back"}
              </button>
              </div>
              <div
                style={{
                  background: "#f7f9fc",
                  padding: "15px",
                  textAlign: "center",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                <AnalsticsOnResult searchTerm={searchTerm}/>
              </div>
                </div>
              </div>
              ):
              <>
                <DisplayMessage message={message}/>
                {/* <ListTestResultPage/> */}
                <ListTestResultPage onItemClick={(testID) => setSearchTerm(testID)} />
              </>
              }
          </div>
    );  
  }

export default SearchResult;
