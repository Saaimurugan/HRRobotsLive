import React, { useState } from "react";

const FeedbackForm = ({ testID, candidateName, onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        "https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/saveFeedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            rating,
            comments,
            candidateName
          }),
        }
      );

      const data = await response.json();
      if (data.statusCode === 200) {
        onSubmit && onSubmit();
      } else {
        // Still proceed even if save fails
        console.error("Failed to save feedback:", data);
        onSubmit && onSubmit();
      }
    } catch (err) {
      // Still proceed even if save fails
      console.error("Error saving feedback:", err);
      onSubmit && onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

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
    maxWidth: "500px",
    width: "90%",
    textAlign: "center",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)"
  };

  const headerStyle = {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "10px"
  };

  const subHeaderStyle = {
    fontSize: "14px",
    color: "#666",
    marginBottom: "25px"
  };

  const starsContainerStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "20px"
  };

  const starStyle = (index) => ({
    cursor: "pointer",
    fontSize: "36px",
    color: index <= (hoveredRating || rating) ? "#ffc107" : "#e0e0e0",
    transition: "color 0.2s, transform 0.2s",
    transform: index <= (hoveredRating || rating) ? "scale(1.1)" : "scale(1)"
  });

  const textareaStyle = {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    resize: "vertical",
    marginBottom: "15px",
    boxSizing: "border-box"
  };

  const errorStyle = {
    color: "#e53e3e",
    fontSize: "13px",
    marginBottom: "10px"
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "12px",
    justifyContent: "center"
  };

  const submitButtonStyle = {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: isSubmitting ? "not-allowed" : "pointer",
    opacity: isSubmitting ? 0.7 : 1
  };

  const skipButtonStyle = {
    backgroundColor: "transparent",
    color: "#666",
    border: "1px solid #ddd",
    padding: "12px 30px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer"
  };

  const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div style={overlayStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>How was your experience?</div>
        <div style={subHeaderStyle}>
          Your feedback helps us improve the test experience
        </div>

        <div style={starsContainerStyle}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              style={starStyle(star)}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              role="button"
              aria-label={`Rate ${star} stars - ${ratingLabels[star - 1]}`}
            >
              ★
            </span>
          ))}
        </div>

        {(hoveredRating || rating) > 0 && (
          <div style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>
            {ratingLabels[(hoveredRating || rating) - 1]}
          </div>
        )}

        <textarea
          style={textareaStyle}
          placeholder="Any additional comments? (optional)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          maxLength={500}
        />

        {error && <div style={errorStyle}>{error}</div>}

        <div style={buttonContainerStyle}>
          <button
            style={skipButtonStyle}
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip
          </button>
          <button
            style={submitButtonStyle}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;
