import React from "react";

const SubmittedMessage = () => {
  const containerStyle = {
    backgroundColor: "#4FFFB0",
    color: "dark grey",
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
    <>
    <div style={containerStyle}>
    <div style={headerStyle}>Submission Successful</div>
    <div style={textStyle}>Your test has been successfully submitted to the recruitment company for evaluation.</div>
    <div style={textStyle}>Please wait, please don't exit the full screen. Redirecting...</div>    
    <div style={textStyle}>You will be redirected in 5 seconds.</div>
    </div>
    </>
  );
};

export default SubmittedMessage;
