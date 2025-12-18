import React, { useState, useEffect } from "react";
import "../App.css"; // Import the CSS or inline styles here
import { GlobalProvider, useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";
import ConfirmationBox from './confirmationBox';
import GetAPIKey from './getAPIKey';
import AssignTemplate from "./assignTemplate";
import ConfigTemplate from "./configTemplate";

const CreateTest = () => {
const [popupVisible, setPopupVisible] = useState(false);
const {globalValue, setGlobalValue } = useGlobalContext();
const {globalAPIValue, setGlobalAPIValue } = useGlobalContext();
const [loading, setLoading] = useState(false);
const [loadingTemplate, setLoadingTemplate] = useState(false);
const [clicked, setClicked] = useState("");
const [message, setMessage] = useState("");
const [templates, setTemplates] = useState([]);
const [templateStates, setTemplateStates] = useState({});
const [uuid, setUuid] = useState("");
const navigate = useNavigate();
const [showConfirmation, setShowConfirmation] = useState(false);
const [showAssignModal, setShowAssignModal] = useState(false);
const [showConfigModal, setShowConfigModal] = useState(false);
const [templateIDSelectedForDelete, setTemplateIDSelectedForDelete] = useState("");
const [templateIDSelectedToAssign, setTemplateIDSelectedToAssign] = useState("");
const [isOpenAPIModal, setIsOpenAPIModal] = useState(false);
const [apiKey, setApiKey] = useState("");

const deleteConfirm = (templateID) => {
  setShowConfirmation(true);
  setTemplateIDSelectedForDelete(templateID);
};

const assignModal = (templateID) => {
  setTemplateIDSelectedToAssign(templateID);
  setShowAssignModal(true);
};

const configModal = (templateID) => {
  //console.log("configModal", templateID);
  setTemplateIDSelectedToAssign(templateID);
  setShowConfigModal(true);
};

const handleSave = () => {
  //console.log('Saved!');
  setIsOpenAPIModal(false);
};

const handleConfirm = () => {
  //console.log('Confirmed!');
  handleDeleteTemplate();
  setShowConfirmation(false);
};

const handleConfigTemplate = (d) => {
  setLoadingTemplate(true);
  try {
    //console.log("Configuration Data:", d);
    //console.log("Template ID Selected to Assign:", templateIDSelectedToAssign);
    const response = fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/setTestConfiguration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateIDSelectedToAssign, d }),
      });
    response.then(res => res.json())
      .then(data => {
        if (data.statusCode === 200) {
          fetchTemplates();
        } else {
          console.error("Error configuring template:", data);
        }
      })
      .catch(error => {
        console.error("Error configuring template:", error);
      });
  } catch (error) { 
    console.error("Error configuring template:", error);
  } finally {
    setLoadingTemplate(false);
  }
};
      
const handleConfig = (d) => {
  handleConfigTemplate(d);
  setShowConfigModal(false);
};

const handleAssign = (email) => {
  handleAssignTemplate(email);
  setShowAssignModal(false);
}

const handleCancel = () => {
  //console.log('Cancelled!');
  setShowConfirmation(false);
  setShowAssignModal(false);
  setIsOpenAPIModal(false);
  setShowConfigModal(false);
};

useEffect(() => {
	if (globalValue === "") {
		navigate("/login"); // Redirect to login if globalValue is false
    } else {
		// Call the async function
    //console.log(globalValue);
		fetchTemplates();
    }
}, [globalValue, navigate]);

const handleCreateTest = async (templateID) => {
  setTemplateStates({}); // Clear all messages
  setLoading(true);
  setClicked(templateID);
  // console.log("templateID: ", templateID);
  setMessage("");

try {
  const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createTest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ globalValue, templateID }),
  });

  const data = await response.json();

  if (data.statusCode === 200) {
    const parsedBody = JSON.parse(data.body);
    setUuid(parsedBody.message);
    setMessage("Test link generated successfully!");
    const newTemplateStates = {
      ...templateStates,
      [templateID]: { uuid: parsedBody.message, message: "Test link generated successfully!" },
    };
    setTemplateStates(newTemplateStates);
  } else {
    const newTemplateStates = {
      ...templateStates,
      [templateID]: { uuid: null, message: "Test link generation failed." },
    };
    setTemplateStates(newTemplateStates);
    setMessage("Test link generation failed.");
  }
} catch (error) {
  console.error("Fetch error: ", error);
  const newTemplateStates = {
    ...templateStates,
    [templateID]: { uuid: null, message: "An error occurred. Please try again later." },
  };
  setTemplateStates(newTemplateStates);
  setMessage("An error occurred. Please try again later.");
} finally {
  setLoading(false);
}
};

const handleCopyToClipboard = (templateID) => {
  if (uuid) {
    const url = `https://www.hrrobots.click/test/${uuid}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setPopupVisible(true);
        setTimeout(() => setPopupVisible(false), 6000); // Hide popup after 6 seconds
      })
      .catch((err) => {
        console.error("Clipboard write failed: ", err);
        const newTemplateStates = {
          ...templateStates,
          [templateID]: {
            ...templateStates[templateID],
            message: "Failed to copy the URL to the clipboard. Please try again.",
          },
        };
        setTemplateStates(newTemplateStates);
        setMessage("Failed to copy the URL to the clipboard. Please try again.");
      }).finally(() => { 
        setClicked(""); 
        setTemplateStates({}); // Clear all messages
      });
  }
};

const handleAssignTemplate = async (email) => {
  setLoading(false);
  try {
    //console.log("Assigning template to:", email);
    //console.log("Template ID:", templateIDSelectedToAssign);
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/Assignedto", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({ templateIDSelectedToAssign, email }),
     });       
     const data = await response.json();
     if (data.statusCode === 200) 
       {
         fetchTemplates();
       }
  } catch (error) {
    console.error("Error fetching templates:", error);
  }
  finally
  {
    setLoading(false);
    setMessage("Template assigned successfully!");
  }
};

const handleDeleteTemplate = async () => {
  try {
    setLoadingTemplate(true);
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTemplate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateIDSelectedForDelete }),
    });       
    const data = await response.json();
    if (data.statusCode === 200) 
      {
        fetchTemplates();
      }
  } catch (error) {
    console.error("Error fetching templates:", error);
  }
  finally
  {
    setLoadingTemplate(false);
  }
};

const fetchTemplates = async () => {
  try {
    setLoadingTemplate(true);
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ globalValue }),
    });       
    const data = await response.json();
    if (data.statusCode === 200)
    { 
      setTemplates(data.body); // Use the parsed data
      setTemplateStates({}); // Clear all messages
      setMessage("");
    }
    else 
    {
      setTemplates([]); // Clear templates if the response is not 200
      setTemplateStates({}); // Clear all messages
      setMessage("No templates found.");
    }
  } catch (error) {
    console.error("Error fetching templates:", error);
  }
  finally
  {
    setLoadingTemplate(false);
  }
};

  return (
    <div className="app">
      {popupVisible && (
        <div className="banner-popup">
          <p>The test URL has been successfully copied to your clipboard. Kindly paste it into an email and send it to the candidate.</p>
          <p>https://www.hrrobots.click/test/{uuid}</p>
        </div>
      )}
      {showConfirmation && (
        <ConfirmationBox
          message="Are you sure you want to delete this template? All the questions associated with it will also be removed!"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {showAssignModal && (
        <AssignTemplate
          title="Assign to Recruiter"
          text="Please enter the email address of the recruiter to whom you want to assign this template."
          onAssign={(d) => handleAssign(d)}
          onCancel={handleCancel}
        />
      )}
      {showConfigModal && (
        <ConfigTemplate
          onConfig={(d) => handleConfig(d)}
          onCancel={handleCancel}
          templateID={templateIDSelectedToAssign}
        />
      )}
      {isOpenAPIModal && (
        <GetAPIKey
          message="Please enter your API key"
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div className="container" style={{ marginTop: "100px" }}>
        <div className="card">
          <h2>Create JD</h2>          
          <p>Enables to quickly generate professional, role-specific job description with minimal effort. By leveraging AI, it intelligently composes detailed and well-structured descriptions based on inputs like job title, skills and experience level.</p>
          <div className="form-group">
            <button onClick={() => navigate("/createJD")}>Create JD</button>
          </div>
        </div>
        <div className="card">
          <h2>Candidate Profiler</h2>
          <p>Effortlessly upload a resume and job description to generate a comprehensive report, highlighting skill matches, role suitability, suggested improvements, and recommendation, ensuring the perfect candidate-job alignment.</p>
          <div className="form-group">
            <button onClick={() => navigate("/ProfilerPage")}>Profile</button>
          </div>
        </div>
        <div className="card">
          <h2>Screening Test</h2>
          <p>AI-driven systems can create customized multiple-choice questions aligned with specific topics, skill levels, or objectives, allowing educators or evaluators to choose the most relevant questions for thorough and accurate assessments.</p>
          <div className="form-group">
            <button onClick={() => navigate("/createTemplate")}>Create Template</button>
          </div>
        </div>
        <div className="card">
          <h2>Result</h2>
          <p>Results page provides a summary of outcomes derived from specific tests. Paste the link shared with the candidate, then click the "Search" button to view the results. To ensure data privacy, we do not store candidates' details.</p>
          <div className="form-group">
            <button onClick={() => navigate("/result")}>Check</button>
          </div>
        </div>	

        {loadingTemplate ? <p className="loading" style={{ gridColumn: '1 / -1' }}>Loading</p> : 
        <>
        {templates.length === 0 ? 
        <p style={{ gridColumn: '1 / -1' }}>No templates found.</p>
        :
        <div className="section-header">
          <h2>List of Screening Test Templates</h2>
          <p>
            Please choose a test from the options below. The test URL will be copied to your clipboard, allowing you to easily paste it into an email
            and share it with the candidate.
          </p>
        </div>
        }
        {templates.map((card, index) => {
          const templateState = templateStates[card.templateID] || {};
          return (
              <div key={index} className="card">
                {card.AssignedTo != globalValue ?
                <div style={{display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "10px"}}>
                <button onClick={() => navigate(`/edit/${card.templateID}`)} className="delete-button" title="Edit Card">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="m3.99 16.854-1.314 3.504a.75.75 0 0 0 .966.965l3.503-1.314a3 3 0 0 0 1.068-.687L18.36 9.175s-.354-1.061-1.414-2.122c-1.06-1.06-2.122-1.414-2.122-1.414L4.677 15.786a3 3 0 0 0-.687 1.068zm12.249-12.63 1.383-1.383c.248-.248.579-.406.925-.348.487.08 1.232.322 1.934 1.025.703.703.945 1.447 1.025 1.934.058.346-.1.677-.348.925L19.774 7.76s-.353-1.06-1.414-2.12c-1.06-1.062-2.121-1.415-2.121-1.415z" fill="#000000"/></svg>
                </button>
                <button onClick={() => deleteConfirm(card.templateID)} className="delete-button" title="Delete Card">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 2H1V4H15V2H12V0H4V2Z" fill="#000000"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M3 6H13V16H3V6ZM7 9H9V13H7V9Z" fill="#000000"/>
                  </svg>
                </button>
                <button onClick={() => assignModal(card.templateID)} className="delete-button" title="Assign to Recruiter">
                  <svg fill="#000000" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" 
                      width="25" height="25" viewBox="0 0 256 190" enableBackground="new 0 0 256 190" xmlSpace="preserve">
                    <path d="M48.12,27.903C48.12,13.564,59.592,2,74.023,2c14.339,0,25.903,11.564,25.903,25.903
                      C99.834,42.335,88.27,53.806,74.023,53.806C59.684,53.806,48.12,42.242,48.12,27.903z M191,139h-47V97c0-20.461-17.881-37-38-37H43
                      C20.912,60,1.99,79.14,2,98v77c-0.026,8.533,6.001,12.989,12,13c6.014,0.011,12-4.445,12-13v-75h8v88h78v-88h8l0.081,50.37
                      c-0.053,8.729,5.342,12.446,10.919,12.63h60C207.363,163,207.363,139,191,139z M254,33.317v88.735c0,2.296-1.837,4.133-4.133,4.133
                      h-88.658c-2.296,0-4.133-1.837-4.133-4.133V33.317c0-2.296,1.837-4.133,4.133-4.133h88.658C252.163,29.184,254,31.021,254,33.317z
                      M249.408,33.776h-43.889v11.671c0,3.559-5.204,6.428-7.423,3.75c-1.645-2.296-4.286-3.865-7.423-3.865
                      c-5.051,0-9.183,4.133-9.183,9.183s4.133,9.183,9.183,9.183c3.023,0,5.778-1.569,7.423-3.865c2.181-2.64,7.423,0.115,7.423,3.865
                      v0.191v13.699h13.699c3.865-0.459,6.428-5.701,3.673-7.997c-2.487-1.837-4.133-4.783-4.133-8.074c0-5.51,4.4-9.91,9.91-9.91
                      s9.91,4.4,9.91,9.91c0,3.291-1.645,6.237-4.133,8.074c-2.755,2.219-0.191,7.347,3.406,7.997h11.556V33.776z M161.668,121.593h43.813
                      v-11.671c0-3.559,5.204-6.428,7.423-3.75c1.645,2.296,4.286,3.865,7.423,3.865c5.051,0,9.183-4.133,9.183-9.183
                      c0-5.051-4.133-9.183-9.183-9.183c-3.023,0-5.778,1.569-7.423,3.865c-2.181,2.64-7.423-0.115-7.423-3.865v-0.191V77.78h-13.699
                      c-3.865,0.383-6.428,5.701-3.673,7.997c2.487,1.837,4.133,4.783,4.133,8.074c0,5.51-4.4,9.91-9.91,9.91s-9.91-4.4-9.91-9.91
                      c0-3.291,1.645-6.237,4.133-8.074c2.755-2.219,0.191-7.347-3.406-7.997h-11.479V121.593z"/>
                    </svg>
                </button>
                {/* <button onClick={() => configModal(card.templateID)} className="delete-button" title="Configuration">
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M14.2788 2.15224C13.9085 2 13.439 2 12.5 2C11.561 2 11.0915 2 10.7212 2.15224C10.2274 2.35523 9.83509 2.74458 9.63056 3.23463C9.53719 3.45834 9.50065 3.7185 9.48635 4.09799C9.46534 4.65568 9.17716 5.17189 8.69017 5.45093C8.20318 5.72996 7.60864 5.71954 7.11149 5.45876C6.77318 5.2813 6.52789 5.18262 6.28599 5.15102C5.75609 5.08178 5.22018 5.22429 4.79616 5.5472C4.47814 5.78938 4.24339 6.1929 3.7739 6.99993C3.30441 7.80697 3.06967 8.21048 3.01735 8.60491C2.94758 9.1308 3.09118 9.66266 3.41655 10.0835C3.56506 10.2756 3.77377 10.437 4.0977 10.639C4.57391 10.936 4.88032 11.4419 4.88029 12C4.88026 12.5581 4.57386 13.0639 4.0977 13.3608C3.77372 13.5629 3.56497 13.7244 3.41645 13.9165C3.09108 14.3373 2.94749 14.8691 3.01725 15.395C3.06957 15.7894 3.30432 16.193 3.7738 17C4.24329 17.807 4.47804 18.2106 4.79606 18.4527C5.22008 18.7756 5.75599 18.9181 6.28589 18.8489C6.52778 18.8173 6.77305 18.7186 7.11133 18.5412C7.60852 18.2804 8.2031 18.27 8.69012 18.549C9.17714 18.8281 9.46533 19.3443 9.48635 19.9021C9.50065 20.2815 9.53719 20.5417 9.63056 20.7654C9.83509 21.2554 10.2274 21.6448 10.7212 21.8478C11.0915 22 11.561 22 12.5 22C13.439 22 13.9085 22 14.2788 21.8478C14.7726 21.6448 15.1649 21.2554 15.3694 20.7654C15.4628 20.5417 15.4994 20.2815 15.5137 19.902C15.5347 19.3443 15.8228 18.8281 16.3098 18.549C16.7968 18.2699 17.3914 18.2804 17.8886 18.5412C18.2269 18.7186 18.4721 18.8172 18.714 18.8488C19.2439 18.9181 19.7798 18.7756 20.2038 18.4527C20.5219 18.2105 20.7566 17.807 21.2261 16.9999C21.6956 16.1929 21.9303 15.7894 21.9827 15.395C22.0524 14.8691 21.9088 14.3372 21.5835 13.9164C21.4349 13.7243 21.2262 13.5628 20.9022 13.3608C20.4261 13.0639 20.1197 12.558 20.1197 11.9999C20.1197 11.4418 20.4261 10.9361 20.9022 10.6392C21.2263 10.4371 21.435 10.2757 21.5836 10.0835C21.9089 9.66273 22.0525 9.13087 21.9828 8.60497C21.9304 8.21055 21.6957 7.80703 21.2262 7C20.7567 6.19297 20.522 5.78945 20.2039 5.54727C19.7799 5.22436 19.244 5.08185 18.7141 5.15109C18.4722 5.18269 18.2269 5.28136 17.8887 5.4588C17.3915 5.71959 16.7969 5.73002 16.3099 5.45096C15.8229 5.17191 15.5347 4.65566 15.5136 4.09794C15.4993 3.71848 15.4628 3.45833 15.3694 3.23463C15.1649 2.74458 14.7726 2.35523 14.2788 2.15224ZM12.5 15C14.1695 15 15.5228 13.6569 15.5228 12C15.5228 10.3431 14.1695 9 12.5 9C10.8305 9 9.47716 10.3431 9.47716 12C9.47716 13.6569 10.8305 15 12.5 15Z" fill="#1C274C"/>
                </svg>
                </button> */}
                </div>
              :
              <>
                <p style={{marginBottom:"-10px", marginTop:"-2px", }}>Assigned by {card.email}</p>
              </>
              }   
              <p>Click on "Generate Test Link"; The test link will be copied to the clipboard</p>
              <>
                {templateState.uuid ? (
                  <div className="form-group">
                    <button onClick={() => handleCopyToClipboard(card.templateID)}>Copy to Clipboard</button>
                  </div>
                ) : (
                  <div className="form-group">
                    <button onClick={() => handleCreateTest(card.templateID)}>
                      {clicked === card.templateID && loading ? "Loading..." : "Generate Test Link"}
                    </button>
                  </div>
                )}
                {templateState.message && <p>{templateState.message}</p>}
                {card.AssignedTo &&
                <>
                  {card.AssignedTo !== globalValue &&
                  <p style={{marginBottom:"-10px", marginTop:"-10px", }}>Assigned to {card.AssignedTo}</p>
                  }
                </>
                }
                <h5>{card.templateName}</h5>
              </>
              </div>
          );
        })}
        </>
        }
        </div>
    </div>
  );
};

export default CreateTest;
