import React from "react";

const ProfileReport = ({ report }) => {
  return (
    <div className="app" style={{ display: "flex", justifyContent: "center", marginTop: "70px" }}>
      {report ? (
        <div className="report" style={{ 
          width: "80%", 
          border: "1px solid #ddd", 
          borderRadius: "10px", 
          padding: "20px", 
          backgroundColor: "#f9f9f9", 
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" 
        }}>
          <h2 style={{ textAlign: "center", color: "#333", marginBottom: "20px" }}>Candidate Report</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
            <tbody>
              <tr>
                <td style={cellStyle}><strong>Candidate Name</strong></td>
                <td style={cellStyle}>{report.CandidateName}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Summary</strong></td>
                <td style={cellStyle}>{report.Summary}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Suitability %</strong></td>
                <td style={cellStyle}>{report.Suitability}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Key Matching Skills</strong></td>
                <td style={cellStyle}>{renderList(report.Matching)}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Gaps in Skills/Experience</strong></td>
                <td style={cellStyle}>{renderList(report.Gaps)}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Additional Strengths</strong></td>
                <td style={cellStyle}>{renderList(report.AdditionalStrengths)}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Suggested Improvements</strong></td>
                <td style={cellStyle}>{renderList(report.SuggestedImprovements)}</td>
              </tr>
              <tr>
                <td style={cellStyle}><strong>Conclusion</strong></td>
                <td style={cellStyle}>{report.Conclusion}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: "center", color: "#888" }}>Loading report...</p>
      )}
    </div>
  );
};

const cellStyle = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
};

const renderList = (items) => (
  <ul style={{ margin: "0", padding: "0 0 0 20px" }}>
    {items.map((item, index) => (
      <li key={index} style={{ marginBottom: "5px" }}>{item}</li>
    ))}
  </ul>
);

export default ProfileReport;
