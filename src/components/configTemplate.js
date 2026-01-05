import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { useGlobalContext } from "../globalContext";
import '../confirmationBox.css';

const ConfigTemplate = ({ onConfig, onCancel, templateID, showToast }) => {
  const { JWTValue, setRedirectPath, logout } = useGlobalContext();
  const [allowedDefaults, setAllowedDefaults] = useState(10);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [testDuration, setTestDuration] = useState(60);
  const [sensitivityLevel, setSensitivityLevel] = useState(3);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Session handler
  const checkUnauthorized = useCallback((data) => {
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      setRedirectPath(location.pathname);
      if (showToast) {
        showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
      }
      logout();
      setTimeout(() => navigate('/login'), 1500);
      return true;
    }
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized") {
          setRedirectPath(location.pathname);
          if (showToast) {
            showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
          }
          logout();
          setTimeout(() => navigate('/login'), 1500);
          return true;
        }
      } catch (e) {}
    }
    return false;
  }, [location.pathname, logout, navigate, setRedirectPath, showToast]);

  useEffect(() => {
    fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateID, token: JWTValue }),
    })
      .then(res => res.json())
      .then(data => {
        if (checkUnauthorized(data)) return;
        if (data.statusCode === 200 && data.body) {
          const body = JSON.parse(data.body);
          const config = Array.isArray(body.configurations) && body.configurations.length > 0
            ? body.configurations[0]
            : {};
          setAllowedDefaults(Number(config.allowedDefaults) || 0);
          setNumberOfQuestions(Number(config.numberOfQuestions) || 10);
          setTestDuration(Number(config.testDuration) || 30);
          setSensitivityLevel(Number(config.sensitivityLevel) || 3);
        }
        setLoading(false);
      })
      .catch(error => {
        setLoading(false);
      });
  }, [templateID, JWTValue, checkUnauthorized]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfig({
      allowedDefaults,
      numberOfQuestions,
      testDuration,
      sensitivityLevel,
    });
  };

  if (loading) {
    return (
      <div className="overlay">
        <div className="confirmation-box">
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="confirmation-box">
        <h2>Configuration</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="numberOfQuestions">Number of Questions: {numberOfQuestions}</label>
            <input
              type="range"
              id="numberOfQuestions"
              name="numberOfQuestions"
              min="1"
              max="60"
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="testDuration">Test Duration (minutes): {testDuration}</label>
            <input
              type="range"
              id="testDuration"
              name="testDuration"
              min="5"
              max="180"
              value={testDuration}
              onChange={(e) => setTestDuration(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sensitivityLevel">Sensitivity Level: {sensitivityLevel} sec</label>
            <input
              type="range"
              id="sensitivityLevel"
              name="sensitivityLevel"
              min="1"
              max="5"
              value={sensitivityLevel}
              onChange={(e) => setSensitivityLevel(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="allowedDefaults">Allowed Defaults: {allowedDefaults}</label>
            <input
              type="range"
              id="allowedDefaults"
              name="allowedDefaults"
              min="1"
              max="10"
              value={allowedDefaults}
              onChange={(e) => setAllowedDefaults(Number(e.target.value))}
            />
          </div>

          <div className="buttons">
            <button type="submit">Save</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigTemplate;
