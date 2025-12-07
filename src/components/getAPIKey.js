import React from 'react';
import '../confirmationBox.css';
import { GlobalProvider, useGlobalContext } from "../globalContext";

const GetAPIKey = ({ message, onSave, onCancel }) => {

const {globalAPIValue, setGlobalAPIValue } = useGlobalContext();

const onChangeSetAPI = (e) => {  
      setGlobalAPIValue(e.target.value);
}

  return (
    <div className="overlay">
      <div className="confirmation-box">
        <p>{message}</p>
        <div className="buttons">
          <input type="text" style={{display:"block", width:"95%"}} onChange={onChangeSetAPI} placeholder="API key" />
          <br/>
          <button onClick={onSave}>Save</button>
          <button onClick={onCancel}>Cancel</button>
          <p>Know how to obtain an OpenAI API key, <a href='https://platform.openai.com/api-keys'>click here</a>.</p>
          <iframe 
            width="100%" 
            height="240" 
            src="https://www.youtube.com/embed/OB99E7Y1cMA" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
         </iframe>
        </div>
      </div>
    </div>
  );
};

export default GetAPIKey;