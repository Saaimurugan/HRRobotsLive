import { useState, useRef } from "react";
import { useGlobalContext } from "../globalContext";
import { useSessionHandler } from "../useSessionHandler";
import Papa from "papaparse";
import "../confirmationBox.css";

function BulkUploadModal({ 
  isOpen, 
  onClose, 
  showToast, 
  templateId, 
  templateName, 
  existingTestCount,
  onBulkUploadSuccess 
}) {
  const [csvFile, setCsvFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [parsedData, setParsedData] = useState([]);
  const fileInputRef = useRef(null);
  const { globalValue, JWTValue } = useGlobalContext();

  // Session handler
  const { checkUnauthorized, checkHttpStatus } = useSessionHandler(showToast);

  const maxTests = 25;
  const availableSlots = Math.max(0, maxTests - (existingTestCount || 0));

  if (!isOpen) return null;

  const handleClose = () => {
    setCsvFile(null);
    setParsedData([]);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = "Name,Email\nJohn Doe,john.doe@example.com\nJane Smith,jane.smith@example.com";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_upload_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Template Downloaded', 'CSV template has been downloaded successfully.');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        showToast('error', 'Invalid File Type', 'Please upload a CSV file.');
        return;
      }

      setCsvFile(file);
      setValidationErrors([]);
      
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          validateCsvData(results.data);
        },
        error: (error) => {
          showToast('error', 'Parse Error', 'Failed to parse CSV file. Please check the format.');
          setCsvFile(null);
        }
      });
    }
  };

  const validateCsvData = (data) => {
    const errors = [];
    const validRows = [];
    const emailSet = new Set();

    // Check if required columns exist
    if (data.length === 0) {
      errors.push("CSV file is empty");
      setValidationErrors(errors);
      return;
    }

    const firstRow = data[0];
    if (!firstRow.hasOwnProperty('Name') || !firstRow.hasOwnProperty('Email')) {
      errors.push("CSV must have 'Name' and 'Email' columns");
      setValidationErrors(errors);
      return;
    }

    // Check available slots
    if (data.length > availableSlots) {
      errors.push(`You can only upload ${availableSlots} candidate(s). You have ${existingTestCount} existing tests out of ${maxTests} maximum. CSV contains ${data.length} rows.`);
      setValidationErrors(errors);
      return;
    }

    // Validate each row
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because of header and 0-index
      const name = row.Name?.trim();
      const email = row.Email?.trim();

      if (!name) {
        errors.push(`Row ${rowNum}: Name is required`);
      }

      if (!email) {
        errors.push(`Row ${rowNum}: Email is required`);
      } else if (!validateEmail(email)) {
        errors.push(`Row ${rowNum}: Invalid email format - ${email}`);
      } else if (emailSet.has(email.toLowerCase())) {
        errors.push(`Row ${rowNum}: Duplicate email - ${email}`);
      } else {
        emailSet.add(email.toLowerCase());
      }

      if (name && email && validateEmail(email)) {
        validRows.push({ name, email });
      }
    });

    setValidationErrors(errors);
    setParsedData(validRows);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!csvFile) {
      showToast('error', 'File Required', 'Please upload a CSV file.');
      return;
    }

    if (validationErrors.length > 0) {
      showToast('error', 'Validation Errors', 'Please fix the validation errors before submitting.');
      return;
    }

    if (parsedData.length === 0) {
      showToast('error', 'No Valid Data', 'No valid candidate data found in the CSV file.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createBulkTests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": JWTValue,
          },
        body: JSON.stringify({
          globalValue: globalValue,
          templateID: templateId,
          token: JWTValue,
          candidates: parsedData,
          templateName: templateName
        }),
      });

      if (checkHttpStatus(response)) return;
      const data = await response.json();

      if (checkUnauthorized(data)) return;

      if (data.statusCode === 200) {
        const result = JSON.parse(data.body);
        showToast('success', 'Bulk Upload Success', 
          `Successfully created ${result.successful} test link(s) and sent emails. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`
        );
        if (onBulkUploadSuccess) {
          onBulkUploadSuccess();
        }
        handleClose();
      } else {
        showToast('error', 'Upload Failed', data.message || 'Failed to create bulk tests. Please try again.');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      showToast('error', 'Error', 'An error occurred during bulk upload. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="overlay">
      <div className="confirmation-box" style={{ minWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2>Bulk Upload Test Links</h2>
        
        <div style={{ 
          backgroundColor: '#f0f9ff', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '20px',
          border: '1px solid #0ea5e9'
        }}>
          <p style={{ margin: '0', fontSize: '14px', color: '#0c4a6e' }}>
            <strong>Available Slots:</strong> {availableSlots} / {maxTests}
            <br />
            <small>You have {existingTestCount} existing test(s). You can create {availableSlots} more.</small>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <button 
              type="button" 
              onClick={downloadTemplate}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Download CSV Template
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="csvFile">Upload CSV File *</label>
            <input 
              type="file" 
              id="csvFile"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              disabled={isProcessing}
              style={{
                padding: '10px',
                border: '2px dashed #cbd5e1',
                borderRadius: '6px',
                width: '100%',
                cursor: 'pointer'
              }}
            />
            <small style={{ color: '#64748b', display: 'block', marginTop: '5px' }}>
              CSV must contain 'Name' and 'Email' columns. Maximum {availableSlots} candidates.
            </small>
          </div>

          {validationErrors.length > 0 && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '15px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ margin: '0', fontWeight: 'bold', color: '#991b1b', fontSize: '15px' }}>
                  Validation Errors ({validationErrors.length})
                </p>
              </div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {validationErrors.map((error, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      fontSize: '13px',
                      color: '#991b1b'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px' }}>
                        <path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span style={{ flex: 1 }}>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {parsedData.length > 0 && validationErrors.length === 0 && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '15px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                marginBottom: '12px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 4L12 14.01l-3-3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p style={{ margin: '0', fontWeight: 'bold', color: '#166534', fontSize: '15px' }}>
                  Valid Candidates: {parsedData.length}
                </p>
              </div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {parsedData.slice(0, 10).map((candidate, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #dcfce7',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          color: '#166534',
                          fontSize: '14px',
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {candidate.name}
                        </div>
                        <div style={{ 
                          color: '#15803d',
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {candidate.email}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                        <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <div style={{
                      padding: '10px 12px',
                      textAlign: 'center',
                      color: '#15803d',
                      fontSize: '13px',
                      fontStyle: 'italic',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '6px',
                      border: '1px dashed #bbf7d0'
                    }}>
                      + {parsedData.length - 10} more candidate{parsedData.length - 10 > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="buttons" style={{ marginTop: '20px' }}>
            <button 
              type="submit" 
              disabled={isProcessing || validationErrors.length > 0 || parsedData.length === 0}
              style={{
                opacity: (isProcessing || validationErrors.length > 0 || parsedData.length === 0) ? 0.6 : 1,
                cursor: (isProcessing || validationErrors.length > 0 || parsedData.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Processing...' : `Create ${parsedData.length} Test Link(s) & Send Emails`}
            </button>
            <button type="button" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BulkUploadModal;
