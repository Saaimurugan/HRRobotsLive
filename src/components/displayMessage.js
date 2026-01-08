import React from "react";
import ScoreChart from "./scoreChart";

const DisplayMessage = ({message, type = "info", isSystemCheck = false}) => {
  // Determine message type based on content if not explicitly provided
  const getMessageType = (msg) => {
    if (type !== "info") return type;
    
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('success') || lowerMsg.includes('submitted')) return 'success';
    if (lowerMsg.includes('error') || lowerMsg.includes('failed')) return 'error';
    if (lowerMsg.includes('warning') || lowerMsg.includes('recommend')) return 'warning';
    return 'info';
  };

  const messageType = getMessageType(message);
  
  // Icon mapping for different message types
  const getIcon = (type) => {
    switch(type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  // System check specific styling
  if (isSystemCheck) {
    return (
      <>
      {message && (
        <div className="system-check-alert">
          <div className="alert-title">System Check Required</div>
          <div className="alert-content">
            {message.split('.').map((sentence, index) => (
              sentence.trim() && (
                <div key={index} style={{marginBottom: '8px'}}>
                  {sentence.includes('laptop or PC') || sentence.includes('desktop device') ? 
                    <span className="alert-highlight">{sentence.trim()}</span> : 
                    sentence.trim()
                  }
                </div>
              )
            ))}
          </div>
        </div>
      )}
      </>
    );
  }

  // Regular alert styling
  return (
    <>
    {message && (
      <div className={`alert-message ${messageType}`}>
        <span className="alert-icon">{getIcon(messageType)}</span>
        <span className="alert-text">{message}</span>
      </div>
    )}
    </>
  );
};

export default DisplayMessage;
