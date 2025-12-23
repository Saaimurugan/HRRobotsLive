import React from "react";

const WarningMessage = ({ reason }) => {
  const reasons = [
    { key: "camera", text: "Camera access is denied" },
    { key: "mic", text: "Mic access is denied" },
    { key: "fullscreen", text: "Fullscreen mode exited" },
    { key: "window", text: "Another window opened" },
    { key: "face", text: "Face not properly focused on the Camera" },
    { key: "multiplefaces", text: "Multiple faces detected on the Camera" },
    { key: "screenshot", text: "Screenshot Captured" },
    { key: "voice", text: "Unauthorized voice/speech detected" },
  ];

  const containerStyle = {
    backgroundColor: "#ffcccb",
    color: "#a94442",
    border: "1px solid #ebccd1",
    padding: "20px",
    borderRadius: "5px",
    maxWidth: "400px",
    textAlign: "center",
    margin: "20px auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  };

  const headerStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px",
  };

  const textStyle = {
    fontSize: "16px",
  };

  const getListItemStyle = (isHighlighted) => ({
    fontSize: "16px",
    textAlign: "left",
    color: isHighlighted ? "#a94442" : "#0e0d0dff",
    fontWeight: isHighlighted ? "bold" : "normal",
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Warning</div>
      <div style={textStyle}>
        Test terminates as one of the below is violated:
      </div>
      <ul>
        {reasons.map((item) => (
          <li key={item.key} style={getListItemStyle(item.key === reason)}>
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WarningMessage;
