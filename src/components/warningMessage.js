import React from "react";

const WarningMessage = () => {
  const containerStyle = {
    backgroundColor: "#ffcccb",
    color: "#a94442",
    border: "1px solid #ebccd1",
    padding: "20px",
    borderRadius: "5px",
    maxWidth: "400px",
    textAlign: "center",
    margin: "20px auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
  };

  const headerStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "10px"
  };

  const textStyle = {
    fontSize: "16px",
  };

  const listStyle = {
    fontSize: "16px",
    textAlign: "left",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Warning</div>
      <div style={textStyle}>Test terminates as one of the below is vilated:</div>
      <ul>
        <li style={listStyle}>Camera access is denied</li>
        <li style={listStyle}>Mic access is denied</li>
        <li style={listStyle}>Fullscreen mode exited</li>
        <li style={listStyle}>Another window opened</li>
        <li style={listStyle}>Face not properly focused on the Camera</li>
      </ul>
    </div>
  );
};

export default WarningMessage;
