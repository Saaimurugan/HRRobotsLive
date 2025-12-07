import React from "react";

const TestIDMissing = () => {
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
    <>
        <div style={containerStyle}>
      <div style={headerStyle}>Need Help?</div>
      If you're looking for the test link, please get in touch with your recruiter. They'll provide you with all the details you need.
    </div>
    </>
  );
};

export default TestIDMissing;
