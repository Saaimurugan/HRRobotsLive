import React, { useState, useEffect } from 'react';
import { GlobalProvider, useGlobalContext } from "../globalContext";
import { useNavigate } from 'react-router-dom';
import ForgotPasswordPage from './forgotPassword';

// Component 1: Get the S3 Bucket Key and ID
const S3Config = () => {
  const [bucketKey, setBucketKey] = useState('');
  const [bucketId, setBucketId] = useState('');
  return (
           <div className="containerLogin">
            <div className="login-container">
    <div style={{ margin: '24px 0', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h3>S3 Configuration</h3>
      <div>
        <label>S3 Bucket Key:&nbsp;
          <input
            type="text"
            value={bucketKey}
            onChange={e => setBucketKey(e.target.value)}
            style={{ width: 250 }}
          />
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>S3 Bucket ID:&nbsp;
          <input
            type="text"
            value={bucketId}
            onChange={e => setBucketId(e.target.value)}
            style={{ width: 250 }}
          />
        </label>
      </div>
    </div>
    </div>
    </div>
  );
};

// Component 2: Get the LLM Key, List of public LLMs as a dropdown, and a text box to add the key
const LLMConfig = () => {
  const [llmKey, setLlmKey] = useState('');
  const [selectedLLM, setSelectedLLM] = useState('');
  const publicLLMs = [
    { value: 'openai', label: 'OpenAI GPT-4' },
    { value: 'claude', label: 'Anthropic Claude' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'nova', label: 'AWS Nova' }
  ];
  return (
              <div className="containerLogin">
            <div className="login-container">
    <div style={{ margin: '24px 0', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
      <h3>LLM Configuration</h3>
      <div>
        <label>Select Public LLM:&nbsp;
          <select
            value={selectedLLM}
            onChange={e => setSelectedLLM(e.target.value)}
            style={{ width: 250 }}
          >
            <option value="">Select LLM</option>
            {publicLLMs.map(llm => (
              <option key={llm.value} value={llm.value}>{llm.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>LLM Key:&nbsp;
          <input
            type="text"
            value={llmKey}
            onChange={e => setLlmKey(e.target.value)}
            style={{ width: 250 }}
          />
        </label>
      </div>
    </div>
    </div>
    </div>
  );
};

const Profile = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const { globalAPIValue, setGlobalAPIValue } = useGlobalContext();
  const { globalValue, setGlobalValue } = useGlobalContext();

  const email = globalAPIValue;
  const navigate = useNavigate();

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login"); // Redirect to login if globalValue is false
    }
  }, [globalValue, navigate]);

  return (
    <>
      <ForgotPasswordPage />
      <S3Config />
      <LLMConfig />
    </>
  );
};

export default Profile;