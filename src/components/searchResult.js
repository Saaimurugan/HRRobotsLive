import React, { useState, useEffect, useRef } from "react";
import { useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";
import ListTestResultPage from "./listTestResultPage"
import ScoreChart from "./scoreChart";
import PhotoCatolog from "./photoCatolog";
import AnalsticsOnResult from "./analsticsOnResult";
import "../App.css";
import "../TableStyles.css";
import "../analsticsOnResult.css";

function SearchResult() {
  const [candidateName, setCandidateName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [tableFilter, setTableFilter] = useState(""); // Separate filter for the table
  const analyticsRef = useRef(null);
  const { globalValue, JWTValue } = useGlobalContext("");
  // Temporary test value for debugging
  const testGlobalValue = globalValue || "test-user-id";
  const navigate = useNavigate();

  useEffect(() => {
    // Temporarily disabled for testing
    // if (globalValue === "") {
    //   navigate("/login");
    // }//else{console.log(globalValue);}
  }, [globalValue, navigate]);

  // Debounced search effect - triggers search as user types
  useEffect(() => {
    const performSearch = async () => {
      if (!candidateName.trim()) {
        // Clear search when input is empty
        setFileContent("");
        setMessage("");
        setMessageType("");
        setTableFilter("");
        return;
      }

      setFileContent("");
      setMessage("");
      setMessageType("");

      try {
        setCandidateLoading(true);
        const searchValue = candidateName.trim();

        // Try test ID search first using the same logic as handleSearchFromList
        try {
          const searchUUID = searchValue.split('/').pop();


          const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ searchTerm: searchUUID, token: JWTValue }),
          });

          const data = await response.json();


          if (data.statusCode === 200) {
            const parsedBody = JSON.parse(data.body);
            setFileContent(parsedBody);
            setMessage(""); // Clear any previous messages
            setMessageType("");
            // Set table filter to candidate name so table shows tests for this candidate
            if (parsedBody.candidateName) {
              setTableFilter(parsedBody.candidateName);
            } else {
              setTableFilter(""); // Fallback to show all tests
            }
            return; // Success, exit early
          } else {

          }
        } catch (error) {

          // Continue to candidate name search if test ID search fails
        }

        // If test ID search failed, check if this looks like a test ID
        const looksLikeTestID = searchValue.length > 15 ||
          /^[a-f0-9-]{8,}$/i.test(searchValue) ||
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchValue);

        if (looksLikeTestID) {
          // Don't filter table by test ID since the API can't search by test ID
          // Just show all tests
          setTableFilter("");
          setMessage("");
          setMessageType("");
        } else {
          // This looks like a candidate name, let the table handle the search
          setTableFilter(searchValue);
          setMessage(`Searching for "${searchValue}"...`);
          setMessageType("info");
        }
      } catch (error) {
        setMessage("An error occurred while searching. Please check your connection and try again.");
        setMessageType("error");
      } finally {
        setCandidateLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 500); // 500ms delay
    return () => clearTimeout(timeoutId);
  }, [candidateName, globalValue]);



  const handleBack = () => {
    setFileContent("");
    setCandidateName("");
    setMessage("");
    setMessageType("");
    setShowAnalytics(false);
    setTableFilter(""); // Clear table filter on back
  };

  const handleGenerateAnalytics = () => {
    setShowAnalytics(true);
    // Trigger the analytics generation in the child component
    if (analyticsRef.current && analyticsRef.current.fetchAnalytics) {
      analyticsRef.current.fetchAnalytics();
    }
    // Scroll to analytics section after a short delay to allow rendering
    setTimeout(() => {
      const analyticsSection = document.querySelector(".analytics-section");
      if (analyticsSection) {
        analyticsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleBackToDashboard = () => {
    navigate('/list');
  };

  const handleCandidateSearch = async () => {
    // This function is no longer used since we have real-time search via useEffect
    // Keeping it for compatibility but making it silent
    if (!candidateName.trim()) {
      return;
    }

    setFileContent("");
    setMessage("");
    setMessageType("");

    try {
      setCandidateLoading(true);
      const searchValue = candidateName.trim();

      // Try test ID search first
      try {
        const searchUUID = searchValue.split('/').pop();
        const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ searchTerm: searchUUID, token: JWTValue }),
        });

        const data = await response.json();
        if (data.statusCode === 200) {
          const parsedBody = JSON.parse(data.body);
          setFileContent(parsedBody);
          setMessage("");
          setMessageType("");
          if (parsedBody.candidateName) {
            setTableFilter(parsedBody.candidateName);
          } else {
            setTableFilter("");
          }
          return;
        }
      } catch (error) {
        // Silent failure
      }

      // If test ID search failed, let the table handle candidate name search
      setTableFilter(searchValue);
      setMessage("");
      setMessageType("");
    } catch (error) {
      // Silent failure
      setMessage("");
      setMessageType("");
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleResetCandidate = () => {
    setCandidateName("");
    setMessage("");
    setMessageType("");
    setTableFilter(""); // Clear table filter on reset
  };

  const handleSearchFromList = async (testID, itemData = {}) => {
    const searchUUID = testID.split('/').pop();
    setMessage("");
    setMessageType("");

    try {
      setCandidateLoading(true);
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchTerm: searchUUID, token: JWTValue }),
      });

      const data = await response.json();

      if (data.statusCode === 200) {
        const parsedBody = JSON.parse(data.body);
        // Merge with additional data from list item (templateName, datetime)
        const enrichedData = {
          ...parsedBody,
          templateName: parsedBody.templateName || itemData.templateName || "N/A",
          submittedAt: parsedBody.submittedAt || itemData.datetime || null,
        };
        setFileContent(enrichedData);
        setMessage(""); // Clear any previous messages
        setMessageType("");
      } else {
        // Don't show error messages for any non-200 responses
        // The test might exist but not be accessible via this API
        // Let the table filtering handle it instead
        setMessage("");
        setMessageType("");
      }
    } catch (error) {
      // Don't show error messages for API failures
      // The table filtering will handle finding the test
      setMessage("");
      setMessageType("");
    } finally {
      setCandidateLoading(false);
    }
  };

  const handlePrint = () => {
    const printableContent = document.getElementById("printableContent");
    if (!printableContent) return;

    // Get analytics content if available
    const analyticsContent = document.querySelector(".analytics-content");
    const analyticsHtml = analyticsContent ? analyticsContent.innerHTML : "";

    const printWindow = window.open("", "_blank");
    const styles = `
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          line-height: 1.5;
          color: #333;
          background: #f5f7fa;
        }
        .test-report-card {
          background: #f5f7fa;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .report-header-section {
          background: linear-gradient(135deg, #6ba3ae 0%, #5a929d 100%);
          color: #ffffff;
          padding: 18px 24px;
          text-align: center;
        }
        .report-header-section h2 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 500;
          letter-spacing: 1px;
        }
        .test-id {
          font-size: 12px;
          opacity: 0.9;
        }
        .report-body {
          padding: 20px;
        }
        .score-chart-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .candidate-info-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          padding: 14px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          flex-wrap: wrap;
          gap: 12px;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }
        .info-value {
          font-size: 13px;
          color: #111827;
          font-weight: 600;
        }
        .score-chart-container {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          justify-content: center;
        }
        .gauge-details-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          min-width: 220px;
          max-width: 240px;
        }
        .gauge-wrapper {
          width: 180px;
          margin: 0 auto;
        }
        .score-summary {
          margin: 4px 0 16px 0;
          font-size: 13px;
          color: #374151;
          font-weight: 600;
          text-align: center;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
          width: 100%;
        }
        .candidate-details-inline .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .candidate-details-inline .detail-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .candidate-details-inline .detail-row:first-child {
          padding-top: 0;
        }
        .candidate-details-inline .detail-label {
          font-weight: 500;
          color: #6b7280;
          font-size: 12px;
        }
        .candidate-details-inline .detail-value {
          color: #111827;
          font-size: 12px;
          font-weight: 600;
          margin-left: 10px;
        }
        .topic-photos-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }
        .topic-table-section {
          background: #ffffff;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }
        .topic-score-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .topic-score-table th,
        .topic-score-table td {
          padding: 8px 10px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
        }
        .topic-score-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .topic-score-table td {
          color: #374151;
        }
        .topic-score-table td:first-child {
          text-align: left;
          font-weight: 500;
        }
        .photo-section-inline {
          background: #ffffff;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          text-align: center;
        }
        .photo-section-title {
          font-size: 14px;
          font-weight: 500;
          color: #4b5563;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #1CBBB4;
          display: inline-block;
        }
        .photo-catalog-container {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .photo-catalog-container img {
          max-width: 150px;
          height: auto;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }
        .analytics-print-section {
          margin-top: 24px;
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }
        .analytics-print-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .analytics-print-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }
        .analytics-print-content {
          width: 100%;
        }
        .analytics-print-content iframe {
          width: 100%;
          border: none;
          min-height: 600px;
        }
        button {
          display: none !important;
        }
        .no-print {
          display: none !important;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 10px;
            background: white;
          }
          .test-report-card {
            box-shadow: none;
          }
          .analytics-print-section {
            box-shadow: none;
            page-break-before: auto;
          }
          button {
            display: none !important;
          }
        }
      </style>
    `;

    // Build analytics section HTML if available
    const analyticsSection = analyticsHtml ? `
      <div class="analytics-print-section">
        <div class="analytics-print-header">
          <h3>Detailed Analytics</h3>
        </div>
        <div class="analytics-print-content">
          ${analyticsHtml}
        </div>
      </div>
    ` : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Test Results - ${fileContent?.testID || 'Report'}</title>
          ${styles}
        </head>
        <body>
          ${printableContent.innerHTML}
          ${analyticsSection}
          <div class="footer">
            <p>Generated by HR Robots | www.hrrobots.com</p>
          </div>
        </body>
      </html>
    `);

    setTimeout(() => {
      printWindow.document.close();
      printWindow.print();
    }, 500);
  };

  /*   function HtmlRenderer({ fileContent }) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: fileContent }}
        />
      );
    } */

  return (
    <div className="modern-result-page">
      <div className="result-container">


        <div className="result-content">
          {!fileContent ? (
            <div className="main-section">
              <div className="recent-tests-section">
                <div className="search-header-section">
                  <div className="header-actions">
                    <button
                      onClick={handleBackToDashboard}
                      className="modern-button modern-button--outline"
                      title="Back to Dashboard"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <div className="search-bar-inline">
                      <div className="search-input-container">
                        <input
                          type="text"
                          placeholder="Search by candidate name or test ID..."
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          className="modern-input search-input-inline"
                          disabled={candidateLoading}
                        />
                        {candidateLoading && (
                          <div className="search-loading-indicator">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 11-6.219-8.56" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleResetCandidate}
                        className="modern-button modern-button--secondary"
                        disabled={candidateLoading}
                        title="Reset"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>

                    </div>
                  </div>

                  {/* {message && (
                    <div className={`search-status-message search-status--${messageType}`}>
                      {message}
                    </div>
                  )} */}
                </div>
                <ListTestResultPage
                  onItemClick={(testID, itemData) => {
                    handleSearchFromList(testID, itemData);
                  }}
                  searchFilter={tableFilter}
                  onSearchChange={(value) => {
                    // Handle mobile search change
                    setTableFilter(value);
                    setCandidateName(value);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="results-display-section">
              <div className="results-header">
                <h2>Test Results</h2>
                <div className="results-actions">
                  <button
                    onClick={handleBack}
                    className="modern-button modern-button--secondary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5" />
                      <path d="M12 19l-7-7 7-7" />
                    </svg>
                    New Search
                  </button>

                  <div className="report-actions-group">
                    <button
                      onClick={handleGenerateAnalytics}
                      className="modern-button modern-button--primary"
                      title="Generate Analytics"
                      disabled={showAnalytics}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                      {showAnalytics ? "Analytics Generated" : "Generate Analytics"}
                    </button>

                    <button
                      onClick={handlePrint}
                      className="modern-button modern-button--outline"
                      title="Print results"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 6,2 18,2 18,9" />
                        <path d="M6,18H4a2,2,0,0,1-2-2V11a2,2,0,0,1,2-2H20a2,2,0,0,1,2,2v5a2,2,0,0,1-2,2H18" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print Report
                    </button>
                  </div>
                </div>
              </div>

              <div className="results-content">
                <div id="printableContent">
                  <div className="test-report-card">
                    <div className="report-header-section">
                      <h2>Assessment Test Report</h2>
                      <div className="test-id">Test ID: {fileContent.testID}</div>
                    </div>

                    <div className="report-body">
                      <ScoreChart message={fileContent} />
                    </div>
                  </div>
                </div>

                {showAnalytics && (
                  <div className="analytics-section">
                    <div className="analytics-header">
                      <h3>Detailed Analytics</h3>
                    </div>
                    <AnalsticsOnResult
                      ref={analyticsRef}
                      searchTerm={fileContent?.testID || candidateName}
                      hideGenerateButton={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


      </div>


    </div>
  );
}

export default SearchResult;
