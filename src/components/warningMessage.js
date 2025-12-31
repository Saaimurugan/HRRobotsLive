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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  };

  const containerStyle = {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "30px 40px",
    maxWidth: "450px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)"
  };

  const iconStyle = {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    backgroundColor: "#dc3545",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 20px"
  };

  const headerStyle = {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "15px"
  };

  const textStyle = {
    fontSize: "15px",
    color: "#666",
    marginBottom: "20px",
    lineHeight: "1.5"
  };

  const infoBoxStyle = {
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
    padding: "15px 20px",
    textAlign: "left"
  };

  const getBulletItemStyle = (isHighlighted) => ({
    display: "flex",
    fontSize: "14px",
    color: isHighlighted ? "#dc3545" : "#666",
    fontWeight: isHighlighted ? "bold" : "normal",
    marginBottom: "8px",
    lineHeight: "1.4"
  });

  const bulletStyle = {
    marginRight: "8px",
    flexShrink: 0
  };

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={iconStyle}>
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </div>
        <div style={headerStyle}>Test Terminated</div>
        <div style={textStyle}>
          Your test has been terminated due to a violation.
        </div>
        <div style={infoBoxStyle}>
          {reasons.map((item, index) => (
            <div 
              key={item.key} 
              style={{
                ...getBulletItemStyle(item.key === reason),
                marginBottom: index === reasons.length - 1 ? 0 : "8px"
              }}
            >
              <span style={bulletStyle}>•</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarningMessage;
