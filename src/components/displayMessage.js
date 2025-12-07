import React from "react";
import ScoreChart from "./scoreChart";

const DisplayMessage = ({message}) => {
  const containerStyle = {
    backgroundColor: "lightgrey",
    color: "dark grey",
    border: "1px solid #ebccd1",
    padding: "20px",
    borderRadius: "5px",
    maxWidth: "100%",
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
    {message&&
    <div style={containerStyle}>
    <div style={headerStyle}>{message}</div>
    </div>
    }
    </>
  );
};

export default DisplayMessage;
