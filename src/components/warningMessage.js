import React from "react";

const WarningMessage = ({ reason }) => {
  const reasons = [
    { key: "camera", text: "Camera access is denied" },
    { key: "mic", text: "Mic access is denied" },
    { key: "fullscreen", text: "Fullscreen mode exited" },
    { key: "window", text: "Window focus lost" },
    { key: "face", text: "Face not properly focused on the Camera" },
    { key: "multiplefaces", text: "Multiple faces detected on the Camera" },
    { key: "screenshot", text: "Screenshot Captured" },
    { key: "voice", text: "Unauthorized voice/speech detected" },
    { key: "timeout", text: "Time limit exceeded" },
  ];

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  };

  const containerStyle = {
    backgroundColor: "#ffcccb",
    color: "#a94442",
    border: "1px solid #ebccd1",
    padding: "20px",
    borderRadius: "5px",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)"
  };

  const headerStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
  };

  const textStyle = {
    fontSize: "16px",
    marginBottom: "15px"
  };

  const getListItemStyle = (isHighlighted) => ({
    fontSize: "16px",
    textAlign: "left",
    color: isHighlighted ? "#dc3545" : "#a94442",
    fontWeight: isHighlighted ? "bold" : "normal",
    marginBottom: "5px"
  });

  const terminatedTextStyle = {
    fontSize: "14px",
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "rgba(220, 53, 69, 0.1)",
    borderRadius: "5px",
    fontWeight: "bold"
  };

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>Test Terminated</div>
        <div style={textStyle}>
          Your test has been terminated due to a violation:
        </div>
        <ul>
          {reasons.map((item) => (
            <li key={item.key} style={getListItemStyle(item.key === reason)}>
              {item.text}
            </li>
          ))}
        </ul>
        <div style={terminatedTextStyle}>
          Please contact the administrator if you believe this was an error.
        </div>
      </div>
    </div>
  );
};

export default WarningMessage;
