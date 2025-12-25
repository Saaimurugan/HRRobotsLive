import React, { useState, useEffect } from 'react';
import { useGlobalContext } from "../globalContext";

const ConfigTemplate =  ({ onConfig, onCancel, templateID }) => {
  const { JWTValue } = useGlobalContext();
  const [faceRecognition, setFaceRecognition] = useState(false);
  const [toleranceLevel, setToleranceLevel] = useState(0);
  const [allowedDefaults, setAllowedDefaults] = useState(0);

  useEffect(() => {
    // Fetch initial config on component mount, passing templateID as a query param
    fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateID, token: JWTValue }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.statusCode === 200 && data.body) {
          // Parse the JSON string in body
          const body = JSON.parse(data.body);
          const config = Array.isArray(body.configurations) && body.configurations.length > 0
            ? body.configurations[0]
            : {};
          setFaceRecognition(config.faceRecognition === "True");
          setToleranceLevel(Number(config.toleranceLevel) || 0);
          setAllowedDefaults(Number(config.allowedDefaults) || 0);
        } else {
          console.error("Error fetching configuration:", data);
        }
      })
      .catch(error => {
        console.error("Error fetching configuration:", error);
      });
  }, [templateID]);

  return (
    <div className="overlay">
      <div className="confirmation-box">
        <div style={{padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
          <h2>Configuration</h2>
          <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 12 }}>
                <label>
                  Terminate based on face recognition:&nbsp;
                  <input
                    type="checkbox"
                    checked={faceRecognition}
                    onChange={e => {
                      setFaceRecognition(e.target.checked);
                      if (!e.target.checked) setToleranceLevel(0);
                    }}
                    style={{ width: 40, height: 20 }}
                  />
                  <span style={{ marginLeft: 8 }}>{faceRecognition ? 'On' : 'Off'}</span>
                </label>
                <div style={{ marginTop: 16 }}>
                  <label htmlFor="toleranceSlider">
                    Tolerance Level: {toleranceLevel}
                  </label>
                  <input
                    id="toleranceSlider"
                    type="range"
                    min="0"
                    max="100"
                    value={toleranceLevel}
                    disabled={!faceRecognition}
                    onChange={e => setToleranceLevel(Number(e.target.value))}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="allowedDefaultsSlider">Allowed defaults by user: {allowedDefaults}</label>
              <input
                id="allowedDefaultsSlider"
                type="range"
                min="1"
                max="10"
                value={allowedDefaults}
                onChange={e => setAllowedDefaults(Number(e.target.value))}
                style={{ width: '90%', marginTop: 8 }}
              />
            </div>
          </div>
          <div className="buttons">
            <button
              onClick={() =>
                onConfig({
                  faceRecognition,
                  toleranceLevel,
                  allowedDefaults,
                })
              }
            >
              Save
            </button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigTemplate;