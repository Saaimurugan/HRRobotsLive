// Import necessary dependencies
import React, { useState } from "react";

const TestAuth = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://wssmlq04ef.execute-api.us-east-1.amazonaws.com/test/test",
        {
          method: "GET",
          headers: {
            authorizationToken: "abc123",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>API Call Example</h1>
      <button
        onClick={fetchData}
        disabled={loading}
        style={{ padding: "10px 20px", fontSize: "16px" }}
      >
        {loading ? "Loading..." : "Fetch Data"}
      </button>
      <div style={{ marginTop: "20px" }}>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
        {data && (
          <div>
            <h2>Response:</h2>
            <pre
              style={{
                backgroundColor: "#f4f4f4",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAuth;
