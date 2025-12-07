import React from 'react';
import '../confirmationBox.css';

const ConfirmationBox = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="overlay">
      <div className="confirmation-box">
        <p>{message}</p>
        <div className="buttons">
          <button onClick={onConfirm}>Confirm</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationBox;