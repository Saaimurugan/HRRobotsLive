import React, { useState, useEffect } from "react";
import "../App.css"; // Import the CSS or inline styles here
import "../CreateTemplate.css"; // Import for toast styles
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useSessionHandler } from "../useSessionHandler";
import ConfirmationBox from './confirmationBox';
import GetAPIKey from './getAPIKey';
import AssignTemplate from "./assignTemplate";
import ConfigTemplate from "./configTemplate";
import CandidateSpecificTestModal from "./CandidateSpecificTestModal";
import EmailModal from "./EmailModal";
import TemplateHistoryModal from "./TemplateHistoryModal";
import { logConfigurationActivity, logAssignActivity, logGenerateTestLinkActivity } from '../utils/activityLogger';
import { logTemplateAssignmentForReview, logTemplateAssignmentToRecruiter, logTemplateApproval, logTemplateConfigurationChange } from '../utils/templateHistoryLogger';

// Toast Component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
          <svg className="toast-icon" viewBox="0 0 24 24">
            {toast.type === 'error' && <path fill="#e53e3e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>}
            {toast.type === 'success' && <path fill="#38a169" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
            {toast.type === 'warning' && <path fill="#dd6b20" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
            {toast.type === 'info' && <path fill="#3182ce" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

const CreateTest = () => {
const [popupVisible, setPopupVisible] = useState(false);
const {globalValue, setGlobalValue, JWTValue, setRedirectPath } = useGlobalContext();
const {globalAPIValue, setGlobalAPIValue } = useGlobalContext();
const [loading, setLoading] = useState(false);
const [loadingTemplate, setLoadingTemplate] = useState(false);
const [clicked, setClicked] = useState("");
const [message, setMessage] = useState("");
const [templates, setTemplates] = useState([]);
const [templateStates, setTemplateStates] = useState({});
const [uuid, setUuid] = useState("");
const navigate = useNavigate();
const location = useLocation();
const [showConfirmation, setShowConfirmation] = useState(false);
const [showAssignModal, setShowAssignModal] = useState(false);
const [showConfigModal, setShowConfigModal] = useState(false);
const [templateIDSelectedForDelete, setTemplateIDSelectedForDelete] = useState("");
const [templateIDSelectedToAssign, setTemplateIDSelectedToAssign] = useState("");
const [currentAssignedTo, setCurrentAssignedTo] = useState("");
const [currentAssignedRole, setCurrentAssignedRole] = useState("");
const [isOpenAPIModal, setIsOpenAPIModal] = useState(false);
const [apiKey, setApiKey] = useState("");
const [toasts, setToasts] = useState([]);
const [showCandidateTestModal, setShowCandidateTestModal] = useState(false);
const [selectedTemplateForCandidate, setSelectedTemplateForCandidate] = useState(null);
const [showSendEmailModal, setShowSendEmailModal] = useState(false);
const [selectedTemplateForEmail, setSelectedTemplateForEmail] = useState(null);
const [searchQuery, setSearchQuery] = useState("");
const [currentPage, setCurrentPage] = useState(1);
const templatesPerPage = 8;
const [sortBy, setSortBy] = useState("date"); // date, name
const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
const [filterBy, setFilterBy] = useState("all"); // all, own, assigned, recruiter, reviewer
const [showSortDropdown, setShowSortDropdown] = useState(false);
const [showFilterDropdown, setShowFilterDropdown] = useState(false);
const [showHistoryModal, setShowHistoryModal] = useState(false);
const [selectedTemplateForHistory, setSelectedTemplateForHistory] = useState(null);

// Toast functions
const showToast = (type, title, message) => {
  const id = Date.now();
  setToasts(prev => [...prev, { id, type, title, message }]);
  setTimeout(() => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, 4000);
};

// Session handler for unauthorized responses
const { checkUnauthorized } = useSessionHandler(showToast);

// Close dropdowns when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (showSortDropdown || showFilterDropdown) {
      const target = event.target;
      if (!target.closest('[data-dropdown]')) {
        setShowSortDropdown(false);
        setShowFilterDropdown(false);
      }
    }
  };
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [showSortDropdown, showFilterDropdown]);

const removeToast = (id) => {
  setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 300);
};

const deleteConfirm = (templateID) => {
  setShowConfirmation(true);
  setTemplateIDSelectedForDelete(templateID);
};

const assignModal = (templateID, assignedTo, assignedRole) => {
  setTemplateIDSelectedToAssign(templateID);
  setCurrentAssignedTo(assignedTo || "");
  setCurrentAssignedRole(assignedRole || "");
  setShowAssignModal(true);
};

const configModal = (templateID) => {
  //console.log("configModal", templateID);
  setTemplateIDSelectedToAssign(templateID);
  setShowConfigModal(true);
};

const openCandidateTestModal = (template) => {
  setSelectedTemplateForCandidate(template);
  setShowCandidateTestModal(true);
};

const openSendEmailModal = (template) => {
  setSelectedTemplateForEmail(template);
  setShowSendEmailModal(true);
};

const handleSave = () => {
  //console.log('Saved!');
  setIsOpenAPIModal(false);
};

const handleConfirm = () => {
  //console.log('Confirmed!');
  setShowConfirmation(false); // Close dialog immediately
  handleDeleteTemplate(); // Delete in background
};

const handleConfigTemplate = async (d) => {
  setLoadingTemplate(true);
  const startTime = Date.now();
  
  // Get current configuration to compare changes
  let oldConfig = {};
  try {
    const getConfigResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateID: templateIDSelectedToAssign, token: JWTValue }),
    });
    const getConfigData = await getConfigResponse.json();
    if (getConfigData.statusCode === 200 && getConfigData.body) {
      const body = JSON.parse(getConfigData.body);
      const config = Array.isArray(body.configurations) && body.configurations.length > 0
        ? body.configurations[0]
        : {};
      oldConfig = {
        numberOfQuestions: Number(config.numberOfQuestions) || 10,
        testDuration: Number(config.testDuration) || 30,
        sensitivityLevel: Number(config.sensitivityLevel) || 3,
        allowedDefaults: Number(config.allowedDefaults) || 0
      };
    }
  } catch (error) {
    console.error('Error fetching old config:', error);
  }
  
  try {
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/setTestConfiguration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templateIDSelectedToAssign, d, token: JWTValue }),
      });
    const data = await response.json();
    
    if (checkUnauthorized(data)) return;
    
    if (data.statusCode === 200) {
      // Build change details
      const changes = [];
      if (oldConfig.numberOfQuestions !== d.numberOfQuestions) {
        changes.push(`Number of Questions: ${oldConfig.numberOfQuestions} → ${d.numberOfQuestions}`);
      }
      if (oldConfig.testDuration !== d.testDuration) {
        changes.push(`Test Duration: ${oldConfig.testDuration} min → ${d.testDuration} min`);
      }
      if (oldConfig.sensitivityLevel !== d.sensitivityLevel) {
        changes.push(`Sensitivity Level: ${oldConfig.sensitivityLevel} sec → ${d.sensitivityLevel} sec`);
      }
      if (oldConfig.allowedDefaults !== d.allowedDefaults) {
        changes.push(`Allowed Defaults: ${oldConfig.allowedDefaults} → ${d.allowedDefaults}`);
      }
      
      // Log configuration activity
      logConfigurationActivity(globalValue, 'config_saved', {
        templateID: templateIDSelectedToAssign,
        numberOfQuestions: d.numberOfQuestions,
        testDuration: d.testDuration,
        sensitivityLevel: d.sensitivityLevel,
        allowedDefaults: d.allowedDefaults,
        status: 'success',
        duration: Date.now() - startTime
      }, JWTValue);
      
      // Log template history if there are changes
      if (changes.length > 0) {
        await logTemplateConfigurationChange(
          templateIDSelectedToAssign,
          globalValue,
          globalValue,
          changes.join('; ')
        );
      }
      
      // Update local template state immediately with new numberOfQuestions
      setTemplates(prevTemplates => 
        prevTemplates.map(template => 
          template.templateID === templateIDSelectedToAssign
            ? { ...template, numberOfQuestions: d.numberOfQuestions }
            : template
        )
      );
      fetchTemplates();
    } else {
      // Log failed configuration
      logConfigurationActivity(globalValue, 'config_saved', {
        templateID: templateIDSelectedToAssign,
        status: 'error',
        duration: Date.now() - startTime,
        errorMessage: 'Failed to save configuration'
      }, JWTValue);
    }
  } catch (error) {
    // Log configuration error
    logConfigurationActivity(globalValue, 'config_saved', {
      templateID: templateIDSelectedToAssign,
      status: 'error',
      duration: Date.now() - startTime,
      errorMessage: error.message
    }, JWTValue);
  } finally {
    setLoadingTemplate(false);
  }
};
      
const handleConfig = (d) => {
  handleConfigTemplate(d);
  setShowConfigModal(false);
};

const handleAssign = (data) => {
  handleAssignTemplate(data.email, data.role);
  setShowAssignModal(false);
}

const handleCancel = () => {
  //console.log('Cancelled!');
  setShowConfirmation(false);
  setShowAssignModal(false);
  setCurrentAssignedTo("");
  setCurrentAssignedRole("");
  setIsOpenAPIModal(false);
  setShowConfigModal(false);
  setShowCandidateTestModal(false);
  setSelectedTemplateForCandidate(null);
  setShowSendEmailModal(false);
  setSelectedTemplateForEmail(null);
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

const checkExistingTestsCount = async () => {
  try {
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestCount", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ globalValue, token: JWTValue }),
    });

    const data = await response.json();
    console.log("getTestCount response:", data);
    
    if (checkUnauthorized(data)) return null;

    if (data.statusCode === 200) {
      // Parse the body if it's a string
      let body = data.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.error("Failed to parse response body:", e);
          return 0;
        }
      }
      
      const totalCount = body.total_count || 0;
      console.log("Total test count:", totalCount);
      return totalCount;
    }
    return 0;
  } catch (error) {
    console.error("Error checking existing tests:", error);
    return 0;
  }
};

const handleCreateTest = async (templateID) => {
  // Find the template to check question count vs numberOfQuestions
  const template = templates.find(t => t.templateID === templateID);
  if (template) {
    const questionCount = template.questionCount || 0;
    const numberOfQuestions = template.numberOfQuestions || 10;
    
    if (questionCount < numberOfQuestions) {
      showToast(
        'error',
        'Insufficient Questions',
        `This template has ${questionCount} question(s) but requires ${numberOfQuestions}. Please add more questions or reduce the "Number of Questions" in the configuration.`
      );
      return;
    }
  }

  // Check existing tests count
  const existingTestsCount = await checkExistingTestsCount();
  console.log("Existing tests count:", existingTestsCount);
  
  if (existingTestsCount !== null && existingTestsCount >= 25) {
    showToast(
      'warning',
      'Test Limit Reached',
      `You have ${existingTestsCount} existing assessments. The maximum limit is 25. Please delete some old assessments from the "Results" before creating a new one.`
    );
    console.log("Test creation blocked due to limit");
    return;
  }
  
  console.log("Test creation proceeding...");

  setTemplateStates({}); // Clear all messages
  setLoading(true);
  setClicked(templateID);
  setMessage("");
  const startTime = Date.now();

try {
  const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createTest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ globalValue, templateID, token: JWTValue }),
  });

  const data = await response.json();

  if (checkUnauthorized(data)) return;

  if (data.statusCode === 200) {
    const parsedBody = JSON.parse(data.body);
    setUuid(parsedBody.message);
    setMessage("Test link generated successfully!");
    
    // Log successful test link generation
    logGenerateTestLinkActivity(globalValue, 'test_link_generated', {
      templateID: templateID,
      testLink: parsedBody.message,
      status: 'success',
      duration: Date.now() - startTime
    }, JWTValue);
    
    const newTemplateStates = {
      ...templateStates,
      [templateID]: { uuid: parsedBody.message, message: "Test link generated successfully!" },
    };
    setTemplateStates(newTemplateStates);
  } else {
    // Log failed test link generation
    logGenerateTestLinkActivity(globalValue, 'test_link_generated', {
      templateID: templateID,
      status: 'error',
      duration: Date.now() - startTime,
      errorMessage: 'Test link generation failed'
    }, JWTValue);
    
    const newTemplateStates = {
      ...templateStates,
      [templateID]: { uuid: null, message: "Test link generation failed." },
    };
    setTemplateStates(newTemplateStates);
    setMessage("Test link generation failed.");
  }
} catch (error) {
  // Log test link generation error
  logGenerateTestLinkActivity(globalValue, 'test_link_generated', {
    templateID: templateID,
    status: 'error',
    duration: Date.now() - startTime,
    errorMessage: error.message
  }, JWTValue);
  
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
        // Log successful test link copy
        logGenerateTestLinkActivity(globalValue, 'test_link_copied', {
          templateID: templateID,
          testLink: uuid,
          status: 'success'
        }, JWTValue);
        
        showToast('info', 'Copied to Clipboard', `The test URL has been copied. Paste it into an email and send it to the candidate. ${url}`);
      })
      .catch((err) => {
        // Log failed test link copy
        logGenerateTestLinkActivity(globalValue, 'test_link_copied', {
          templateID: templateID,
          status: 'error',
          errorMessage: 'Failed to copy to clipboard'
        }, JWTValue);
        
        showToast('error', 'Copy Failed', 'Failed to copy the URL to the clipboard. Please try again.');
      }).finally(() => { 
        setClicked(""); 
        setTemplateStates({}); // Clear all messages
      });
  }
};

const handleAssignTemplate = async (email, role = 'recruiter') => {
  setLoading(true);
  const startTime = Date.now();
  try {
    // If email is empty, this is a revoke operation
    if (!email) {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/Assignedto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          templateID: templateIDSelectedToAssign, 
          assignedEmail: "REVOKE", 
          assignedRole: "", 
          actorEmail: globalValue,
          token: JWTValue 
        }),
      });
      const data = await response.json();
      if (checkUnauthorized(data)) return;
      if (data.statusCode === 200) {
        // Log successful revoke
        logAssignActivity(globalValue, 'assignment_revoked', {
          templateID: templateIDSelectedToAssign,
          status: 'success',
          duration: Date.now() - startTime
        }, JWTValue);
        
        fetchTemplates();
        showToast('success', 'Assignment Revoked', 'The assignment has been successfully revoked.');
      }
      return;
    }

    // Check if email is registered
    const checkEmailResponse = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/checkEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const checkData = await checkEmailResponse.json();
    const isUserRegistered = checkData.statusCode !== 200;

    const roleLabel = role === 'hiring_manager' ? 'Reviewer' : 'Recruiter';

    // Assign the template regardless of registration status
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/Assignedto", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({ 
         templateID: templateIDSelectedToAssign, 
         assignedEmail: email, 
         assignedRole: role, 
         actorEmail: globalValue,
         action: "assign",
         token: JWTValue 
       }),
     });       
     const data = await response.json();
     if (checkUnauthorized(data)) return;
     if (data.statusCode === 200) {
       // Log successful assignment
       logAssignActivity(globalValue, 'template_assigned', {
         templateID: templateIDSelectedToAssign,
         assignedEmail: email,
         assignedRole: role,
         status: 'success',
         duration: Date.now() - startTime
       }, JWTValue);
       
       // Log template history
       if (role === 'hiring_manager') {
         await logTemplateAssignmentForReview(
           templateIDSelectedToAssign,
           globalValue,
           globalValue,
           email,
           email,
           role
         );
       } else {
         await logTemplateAssignmentToRecruiter(
           templateIDSelectedToAssign,
           globalValue,
           globalValue,
           email,
           email
         );
       }
       
       fetchTemplates();
       
       // If user is not registered, send an invite email
       if (!isUserRegistered) {
         const roleDescription = role === 'hiring_manager' 
           ? 'As a Reviewer, you can review and edit the template questions, approve the template, and create test links for candidates.'
           : 'As a Recruiter, you can create test links for candidates using this template.';
         
         const inviteBody = `
           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
             <h2 style="color: #1cbbb4;">You're Invited to HR Robots!</h2>
             <p>Hello,</p>
             <p><strong>${globalValue}</strong> has assigned you a screening test template as a <strong>${roleLabel}</strong> and invited you to join HR Robots platform.</p>
             <p>${roleDescription}</p>
             <p>HR Robots helps streamline your hiring process with AI-powered tools for candidate profiling, interviews, and more.</p>
             <p style="margin-top: 20px;">
               <a href="https://www.hrrobots.click/signup" 
                  style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
                         color: white; 
                         padding: 12px 24px; 
                         text-decoration: none; 
                         border-radius: 6px; 
                         display: inline-block;">
                 Get Started
               </a>
             </p>
             <p style="margin-top: 20px; color: #666; font-size: 14px;">
               Sign up to access the template that has been assigned to you.
             </p>
           </div>
         `;

         await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/sendEmailSMTP", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             recipient_email: email,
             subject: `${globalValue} assigned you a template on HR Robots`,
             body: inviteBody
           }),
         });
         
         showToast('success', 'Template Assigned', `Template assigned to ${email} as ${roleLabel}. An invitation email has been sent since they are not registered.`);
       } else {
         showToast('success', 'Template Assigned', `Template assigned successfully to ${email} as ${roleLabel}.`);
       }
     }
  } catch (error) {
    //console.error("Error assigning template:", error);
    showToast('error', 'Error', 'An error occurred while assigning the template.');
  }
  finally
  {
    setLoading(false);
  }
};

const handleApproveTemplate = async (templateID, ownerEmail) => {
  setLoading(true);
  try {
    // Call the API to approve the template
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/Assignedto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        templateID: templateID, 
        action: "approve",
        actorEmail: globalValue,
        actorName: globalValue.split('@')[0], // Use email prefix as name
        token: JWTValue 
      }),
    });
    
    const data = await response.json();
    if (checkUnauthorized(data)) return;
    
    if (data.statusCode === 200) {
      // Log template approval history
      await logTemplateApproval(
        templateID,
        globalValue,
        globalValue,
        ''
      );
      
      // Refresh templates to show updated status
      fetchTemplates();
      
      // Send notification email to the template owner
      const approvalEmailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #16a34a;">Template Approved! ✓</h2>
          <p>Hello,</p>
          <p>Great news! Your screening test template has been reviewed and <strong>approved</strong> by <strong>${globalValue}</strong>.</p>
          <p>The template is now ready for use. You can start generating test links for candidates.</p>
          <p style="margin-top: 20px;">
            <a href="https://www.hrrobots.click/list" 
               style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;">
              View Templates
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Thank you for using HR Robots!
          </p>
        </div>
      `;

      await fetch("https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/sendEmailSMTP", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: ownerEmail,
          subject: `Your template has been approved by ${globalValue}`,
          body: approvalEmailBody
        }),
      });
      
      showToast('success', 'Template Approved', 'The template has been approved and the owner has been notified.');
    } else {
      showToast('error', 'Error', 'Failed to approve the template.');
    }
  } catch (error) {
    showToast('error', 'Error', 'An error occurred while approving the template.');
  } finally {
    setLoading(false);
  }
};

const handleDeleteTemplate = async () => {
  // Store the template to restore if deletion fails
  const templateToDelete = templates.find(t => t.templateID === templateIDSelectedForDelete);
  
  // Optimistically remove from UI immediately
  setTemplates(prev => prev.filter(t => t.templateID !== templateIDSelectedForDelete));
  
  // Delete in background without blocking UI
  try {
    const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTemplate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ templateIDSelectedForDelete, token: JWTValue }),
    });       
    const data = await response.json();
    if (checkUnauthorized(data)) {
      // Restore template if unauthorized
      if (templateToDelete) {
        setTemplates(prev => [...prev, templateToDelete]);
      }
      return;
    }
    if (data.statusCode === 200) {
      showToast('success', 'Template Deleted', 'The template has been successfully removed.');
    } else {
      // Restore template on failure
      if (templateToDelete) {
        setTemplates(prev => [...prev, templateToDelete]);
      }
      showToast('error', 'Deletion Failed', 'Failed to delete the template. Please try again.');
    }
  } catch (error) {
    // Restore template on error
    if (templateToDelete) {
      setTemplates(prev => [...prev, templateToDelete]);
    }
    showToast('error', 'Error', 'An error occurred while deleting the template.');
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
      body: JSON.stringify({ globalValue, token: JWTValue }),
    });       
    const data = await response.json();
    if (checkUnauthorized(data)) return;
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
    //console.error("Error fetching templates:", error);
  }
  finally
  {
    setLoadingTemplate(false);
  }
};

// Filter templates based on search query and filter type
const filteredTemplates = templates
  .filter(template => {
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const templateName = (template.templateName || "").toLowerCase();
      const assignedTo = (template.AssignedTo || "").toLowerCase();
      const email = (template.email || "").toLowerCase();
      
      if (!templateName.includes(query) && !assignedTo.includes(query) && !email.includes(query)) {
        return false;
      }
    }
    
    // Apply category filter
    switch (filterBy) {
      case "own":
        return template.email === globalValue && template.AssignedTo !== globalValue;
      case "assigned":
        return template.AssignedTo === globalValue;
      case "recruiter":
        return template.AssignedTo && template.AssignedRole === "recruiter";
      case "reviewer":
        return template.AssignedTo && template.AssignedRole === "hiring_manager";
      default:
        return true;
    }
  })
  .sort((a, b) => {
    // Apply sorting
    if (sortBy === "date") {
      const dateA = new Date(a.datetime || 0);
      const dateB = new Date(b.datetime || 0);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    } else if (sortBy === "name") {
      const nameA = (a.templateName || "").toLowerCase();
      const nameB = (b.templateName || "").toLowerCase();
      return sortOrder === "desc" ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
    }
    return 0;
  });

// Pagination calculations
const totalPages = Math.ceil(filteredTemplates.length / templatesPerPage);
const indexOfLastTemplate = currentPage * templatesPerPage;
const indexOfFirstTemplate = indexOfLastTemplate - templatesPerPage;
const currentTemplates = filteredTemplates.slice(indexOfFirstTemplate, indexOfLastTemplate);

// Reset to page 1 when search query or filters change
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, filterBy, sortBy, sortOrder]);

// Adjust current page if it becomes invalid after deletion
useEffect(() => {
  const maxPage = Math.ceil(filteredTemplates.length / templatesPerPage);
  if (currentPage > maxPage && maxPage > 0) {
    setCurrentPage(maxPage);
  }
}, [filteredTemplates.length, currentPage, templatesPerPage]);

// Pagination handlers
const goToPage = (pageNumber) => {
  setCurrentPage(pageNumber);
  // Scroll to templates section
  const sectionHeader = document.querySelector('.section-header');
  if (sectionHeader) {
    sectionHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const goToPreviousPage = () => {
  if (currentPage > 1) goToPage(currentPage - 1);
};

const goToNextPage = () => {
  if (currentPage < totalPages) goToPage(currentPage + 1);
};

// Generate page numbers to display
const getPageNumbers = () => {
  const pages = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }
  }
  return pages;
};

  return (
    <div className="app">
      <Toast toasts={toasts} removeToast={removeToast} />
      {showConfirmation && (
        <ConfirmationBox
          message="Are you sure you want to delete this template? All the questions associated with it will also be removed!"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {showAssignModal && (
        <AssignTemplate
          title="Assign to Recruiter or Reviewer"
          text="Please enter the email address of the person to whom you want to assign this template."
          onAssign={(d) => handleAssign(d)}
          onCancel={handleCancel}
          currentAssignedTo={currentAssignedTo}
          currentRole={currentAssignedRole}
        />
      )}
      {showConfigModal && (
        <ConfigTemplate
          onConfig={(d) => handleConfig(d)}
          onCancel={handleCancel}
          templateID={templateIDSelectedToAssign}
        />
      )}
      {showCandidateTestModal && selectedTemplateForCandidate && (
        <CandidateSpecificTestModal
          isOpen={showCandidateTestModal}
          onClose={handleCancel}
          showToast={showToast}
          template={selectedTemplateForCandidate}
          onTemplateCreated={fetchTemplates}
        />
      )}
      {showSendEmailModal && selectedTemplateForEmail && (
        <EmailModal
          isOpen={showSendEmailModal}
          onClose={handleCancel}
          showToast={showToast}
          testLink={templateStates[selectedTemplateForEmail.templateID]?.uuid 
            ? `https://www.hrrobots.click/test/${templateStates[selectedTemplateForEmail.templateID].uuid}`
            : ''}
          templateName={selectedTemplateForEmail.templateName}
          onEmailSent={() => {
            setTemplateStates({});
            setClicked("");
          }}
        />
      )}
      {showHistoryModal && selectedTemplateForHistory && (
        <TemplateHistoryModal
          templateID={selectedTemplateForHistory.templateID}
          templateName={selectedTemplateForHistory.templateName}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedTemplateForHistory(null);
          }}
        />
      )}
      {isOpenAPIModal && (
        <GetAPIKey
          message="Please enter your API key"
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div className="container" style={{ marginTop: "45pt" }}>
        <div className="card" data-tour="create-jd">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="currentColor"/>
              <path d="M14 2V8H20" fill="currentColor" fillOpacity="0.5"/>
              <path d="M12 18V12M9 15H15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h2>Create JD</h2>          
          <p>Generate professional, role-specific job descriptions with AI. Compose detailed descriptions based on job title, skills, and experience level.</p>
          <div className="form-group">
            <button onClick={() => navigate("/createJD")}>Create JD</button>
          </div>
        </div>
        <div className="card" data-tour="candidate-profiler">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
              <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor" fillOpacity="0.7"/>
            </svg>
          </div>
          <h2>Candidate Profiler</h2>
          <p>Upload a resume and job description to generate a comprehensive report highlighting skill matches and role suitability.</p>
          <div className="form-group">
            <button onClick={() => navigate("/ProfilerPage")}>Profile</button>
          </div>
        </div>
        <div className="card" data-tour="screening-test">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" fill="currentColor" fillOpacity="0.3"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Screening Assessment</h2>
          <p>Create customized MCQ assessments aligned with specific topics, skill levels, or objectives using AI-driven question generation.</p>
          <div className="form-group">
            <button onClick={() => navigate("/createTemplate")}>Create Template</button>
          </div>
        </div>
        <div className="card" data-tour="check-results">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 20V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 20V4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 20V14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Results</h2>
          <p>View test outcomes by pasting the candidate's link.<br/>Get detailed summaries while maintaining data privacy.</p>
          <div className="form-group">
            <button onClick={() => navigate("/result")}>Check Results</button>
          </div>
        </div>	

        {loadingTemplate ? (
          <>
            <div className="section-header">
              <div className="section-header-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="section-header-content">
                <h2>Your Screening Assessment Templates</h2>
                <p>
                  Select a template to generate a unique assessment link. Share it with candidates via email to begin their assessment.
                </p>
              </div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card template-card skeleton-card">
                <div className="skeleton-actions">
                  <div className="skeleton skeleton-icon"></div>
                  <div className="skeleton skeleton-icon"></div>
                  <div className="skeleton skeleton-icon"></div>
                </div>
                <div className="skeleton skeleton-text skeleton-text-sm"></div>
                <div className="skeleton skeleton-button"></div>
                <div className="skeleton skeleton-text skeleton-text-lg"></div>
              </div>
            ))}
          </>
        ) : (
        <>
        {templates.length === 0 ? (
          
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
            {/* Empty State Message */}
            <div className="empty-state" style={{ marginTop: '0' }}>
              <p>You don't have any templates yet. Create your first template using the Screening Assessment options above, or click Browse Templates below to clone one from the Template Library.</p>
            </div>
            {/* Clone Templates Card */}
            <div className="card template-card" style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(29, 78, 216, 0.05) 100%)',
              border: '2px dashed var(--color-primary, #2563eb)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              
              <p style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                Browse pre-built templates for popular technologies
              </p>
              
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                margin: '16px 0',
                minHeight: '50px'
              }}>
                {/* Technology Logos */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3178c6 0%, #235a97 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="TypeScript" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>TS</div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #f7df1e 0%, #e5c700 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="JavaScript" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>JS</div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="React" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>⚛</div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3776ab 0%, #2d5d8a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="Python" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>Py</div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #f05032 0%, #c9402d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="Git" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 0 0-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 0 1 1.939 1.95l2.214 2.217a1.53 1.53 0 0 1 1.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 0 1-.337-1.662l-2.074-2.063V14.9c.146.071.286.169.407.29a1.537 1.537 0 0 1 0 2.166 1.536 1.536 0 0 1-2.174 0 1.528 1.528 0 0 1 0-2.164c.152-.15.322-.264.504-.339v-5.49a1.529 1.529 0 0 1-.83-2.008l-2.26-2.271-5.987 5.982c-.5.504-.5 1.32 0 1.824l8.731 8.729a1.286 1.286 0 0 0 1.821 0l8.69-8.689a1.284 1.284 0 0 0 .003-1.822"/>
                  </svg>
                </div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #0052cc 0%, #003d99 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '9px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="Jira" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/>
                  </svg>
                </div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #00758f 0%, #005f73 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="MySQL" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.064h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.678-2.227.835-3.483zm12.325 4.08h-2.63v-5.53h.885v4.85h1.745zm-3.32.135l-1.016-.5c.09-.076.177-.158.255-.25.433-.506.648-1.258.648-2.253 0-1.83-.718-2.746-2.155-2.746-.704 0-1.254.232-1.65.697-.43.508-.646 1.256-.646 2.245 0 .972.19 1.686.574 2.14.35.41.877.615 1.583.615.264 0 .506-.033.725-.098l1.325.772.36-.622zM15.5 17.588c-.225-.36-.337-.94-.337-1.736 0-1.393.424-2.09 1.27-2.09.443 0 .77.167.977.5.224.362.336.936.336 1.723 0 1.404-.424 2.108-1.27 2.108-.445 0-.77-.167-.978-.5zm-1.658-.425c0 .47-.172.856-.516 1.156-.344.3-.803.45-1.384.45-.543 0-1.064-.172-1.573-.515l.237-.476c.438.22.833.328 1.19.328.332 0 .593-.073.783-.22a.754.754 0 00.3-.615c0-.33-.23-.61-.648-.845-.388-.213-1.163-.657-1.163-.657-.422-.307-.632-.636-.632-1.177 0-.45.157-.81.47-1.085.315-.278.72-.415 1.22-.415.512 0 .98.136 1.4.41l-.213.476a2.726 2.726 0 00-1.064-.23c-.283 0-.502.068-.654.206a.685.685 0 00-.248.524c0 .328.234.61.666.85.393.215 1.187.67 1.187.67.433.305.648.63.648 1.168zm9.382-5.852c-.535-.014-.95.04-1.297.188-.1.04-.26.04-.274.167.055.053.063.14.11.214.08.134.218.313.346.407.14.11.28.216.427.31.26.16.555.255.81.416.145.094.293.213.44.313.073.05.12.14.214.172v-.02c-.046-.06-.06-.147-.105-.214-.067-.067-.134-.127-.2-.193a3.223 3.223 0 00-.695-.675c-.214-.146-.682-.35-.77-.595l-.013-.014c.146-.013.32-.066.46-.106.227-.06.435-.047.67-.106.106-.027.213-.06.32-.094v-.06c-.12-.12-.21-.283-.334-.395a8.867 8.867 0 00-1.104-.823c-.21-.134-.476-.22-.697-.334-.08-.04-.214-.06-.26-.127-.12-.146-.19-.34-.275-.514a17.69 17.69 0 01-.547-1.163c-.12-.262-.193-.523-.34-.763-.69-1.137-1.437-1.826-2.586-2.5-.247-.14-.543-.2-.856-.274-.167-.008-.334-.02-.5-.027-.11-.047-.216-.174-.31-.235-.38-.24-1.364-.76-1.644-.072-.18.434.267.862.422 1.082.115.153.26.328.34.5.047.116.06.235.107.356.106.294.207.622.347.897.073.14.153.287.247.413.054.073.146.107.167.227-.094.136-.1.334-.154.5-.24.757-.146 1.693.194 2.25.107.166.362.534.703.393.3-.12.234-.5.32-.835.02-.08.007-.133.048-.187v.015c.094.188.188.367.274.555.206.328.566.668.867.895.16.12.287.328.487.402v-.02h-.015c-.043-.058-.1-.086-.154-.133a3.445 3.445 0 01-.35-.4 8.76 8.76 0 01-.747-1.218c-.11-.21-.202-.436-.29-.643-.04-.08-.04-.2-.107-.24-.1.146-.247.273-.32.453-.127.288-.14.642-.188 1.01-.027.007-.014 0-.027.014-.214-.052-.287-.274-.367-.46-.2-.475-.233-1.238-.06-1.785.047-.14.247-.582.167-.716-.042-.127-.174-.2-.247-.303a2.478 2.478 0 01-.24-.427c-.16-.374-.24-.788-.414-1.162-.08-.173-.22-.354-.334-.513-.127-.18-.267-.307-.368-.52-.033-.073-.08-.194-.027-.274.014-.054.042-.075.094-.09.088-.072.335.022.422.062.247.1.455.194.662.334.094.066.195.193.315.226h.14c.214.047.455.014.655.073.355.114.675.28.962.46a5.953 5.953 0 012.085 2.286c.08.154.115.295.188.455.14.33.313.663.455.982.14.315.275.636.476.897.105.14.502.213.682.286.133.06.34.115.46.188.23.14.454.3.67.454.11.076.443.243.463.378z"/>
                  </svg>
                </div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #181717 0%, #000000 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }} title="GitHub" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </div>
              </div>
              
              <div className="form-group">
                <button onClick={() => navigate("/cloneTemplates")} style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                  color: 'white'
                }}>
                  <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Browse Templates
                  </span>
                </button>
              </div>
              
              <h5 style={{marginTop: "8px", textAlign: 'center', color: 'var(--color-primary)'}}>Clone Templates</h5>
            </div>            
          </div>
        ) : (
        <>
        <div className="section-header">
          <div className="section-header-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="section-header-content">
            <h2>Your Screening Assessment Templates</h2>
            <p>
              Select a template to generate a unique assessment link. Share it with candidates via email to begin their assessment.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', gridColumn: '1 / -1', flexWrap: 'wrap' }}>
          <div className="search-container" style={{ margin: 0 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery("")}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
          
          {/* Sort Dropdown */}
          <div style={{ position: 'relative' }} data-dropdown="sort">
            <button
              onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                border: '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-primary)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H21M6 12H18M9 18H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Sort: {sortBy === "date" ? "Date" : "Name"} ({sortOrder === "desc" ? "↓" : "↑"})
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '2px' }}>
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showSortDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                minWidth: '160px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '4px' }}>
                  <button
                    onClick={() => { setSortBy("date"); setSortOrder("desc"); setShowSortDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: sortBy === "date" && sortOrder === "desc" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Date (Newest first)
                  </button>
                  <button
                    onClick={() => { setSortBy("date"); setSortOrder("asc"); setShowSortDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: sortBy === "date" && sortOrder === "asc" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Date (Oldest first)
                  </button>
                  <button
                    onClick={() => { setSortBy("name"); setSortOrder("asc"); setShowSortDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: sortBy === "name" && sortOrder === "asc" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Name (A-Z)
                  </button>
                  <button
                    onClick={() => { setSortBy("name"); setSortOrder("desc"); setShowSortDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: sortBy === "name" && sortOrder === "desc" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Name (Z-A)
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Filter Dropdown */}
          <div style={{ position: 'relative' }} data-dropdown="filter">
            <button
              onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                border: filterBy !== "all" ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: filterBy !== "all" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'var(--color-bg-primary)',
                color: filterBy !== "all" ? 'var(--color-primary)' : 'var(--color-text-primary)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {filterBy === "all" ? "All Templates" : 
               filterBy === "own" ? "My Templates" : 
               filterBy === "assigned" ? "Assigned to Me" :
               filterBy === "recruiter" ? "Recruiter" : "Reviewer"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '2px' }}>
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showFilterDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                minWidth: '180px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '4px' }}>
                  <button
                    onClick={() => { setFilterBy("all"); setShowFilterDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: filterBy === "all" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    All Templates
                  </button>
                  <button
                    onClick={() => { setFilterBy("own"); setShowFilterDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: filterBy === "own" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    My Templates
                  </button>
                  <button
                    onClick={() => { setFilterBy("assigned"); setShowFilterDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: filterBy === "assigned" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Assigned to Me
                  </button>
                  <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }}></div>
                  <button
                    onClick={() => { setFilterBy("recruiter"); setShowFilterDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: filterBy === "recruiter" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Assigned to Recruiter
                  </button>
                  <button
                    onClick={() => { setFilterBy("reviewer"); setShowFilterDropdown(false); }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: filterBy === "reviewer" ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                      color: 'var(--color-text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  >
                    Assigned for Review
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Clear filters button */}
          {(filterBy !== "all" || searchQuery) && (
            <button
              onClick={() => { setFilterBy("all"); setSearchQuery(""); setSortBy("date"); setSortOrder("desc"); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                transition: 'color 0.2s ease'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Clear
            </button>
          )}
          
          {/* Template count */}
          <span style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            marginLeft: 'auto'
          }}>
            {filteredTemplates.length > templatesPerPage 
              ? `Showing ${indexOfFirstTemplate + 1}-${Math.min(indexOfLastTemplate, filteredTemplates.length)} of ${filteredTemplates.length}`
              : `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''}`
            }
          </span>
        </div>
        {filteredTemplates.length === 0 && searchQuery ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No templates found matching "{searchQuery}"</p>
          </div>
        ) : null}
        </>
        )}
        
        {/* Clone Templates Card - Always visible as first card */}
        {templates.length > 0 && (
        <div className="card template-card" data-tour="clone-templates" style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(29, 78, 216, 0.05) 100%)',
          border: '2px dashed var(--color-primary, #2563eb)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          <p style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
            Browse pre-built templates for popular technologies
          </p>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
            margin: '16px 0',
            minHeight: '50px'
          }}>
            {/* Technology Logos */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #3178c6 0%, #235a97 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="TypeScript" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>TS</div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #f7df1e 0%, #e5c700 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="JavaScript" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>JS</div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="React" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>⚛</div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #3776ab 0%, #2d5d8a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="Python" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>Py</div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #f05032 0%, #c9402d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="Git" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 0 0-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 0 1 1.939 1.95l2.214 2.217a1.53 1.53 0 0 1 1.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 0 1-.337-1.662l-2.074-2.063V14.9c.146.071.286.169.407.29a1.537 1.537 0 0 1 0 2.166 1.536 1.536 0 0 1-2.174 0 1.528 1.528 0 0 1 0-2.164c.152-.15.322-.264.504-.339v-5.49a1.529 1.529 0 0 1-.83-2.008l-2.26-2.271-5.987 5.982c-.5.504-.5 1.32 0 1.824l8.731 8.729a1.286 1.286 0 0 0 1.821 0l8.69-8.689a1.284 1.284 0 0 0 .003-1.822"/>
              </svg>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0052cc 0%, #003d99 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '9px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="Jira" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z"/>
              </svg>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #00758f 0%, #005f73 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="MySQL" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.064h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.678-2.227.835-3.483zm12.325 4.08h-2.63v-5.53h.885v4.85h1.745zm-3.32.135l-1.016-.5c.09-.076.177-.158.255-.25.433-.506.648-1.258.648-2.253 0-1.83-.718-2.746-2.155-2.746-.704 0-1.254.232-1.65.697-.43.508-.646 1.256-.646 2.245 0 .972.19 1.686.574 2.14.35.41.877.615 1.583.615.264 0 .506-.033.725-.098l1.325.772.36-.622zM15.5 17.588c-.225-.36-.337-.94-.337-1.736 0-1.393.424-2.09 1.27-2.09.443 0 .77.167.977.5.224.362.336.936.336 1.723 0 1.404-.424 2.108-1.27 2.108-.445 0-.77-.167-.978-.5zm-1.658-.425c0 .47-.172.856-.516 1.156-.344.3-.803.45-1.384.45-.543 0-1.064-.172-1.573-.515l.237-.476c.438.22.833.328 1.19.328.332 0 .593-.073.783-.22a.754.754 0 00.3-.615c0-.33-.23-.61-.648-.845-.388-.213-1.163-.657-1.163-.657-.422-.307-.632-.636-.632-1.177 0-.45.157-.81.47-1.085.315-.278.72-.415 1.22-.415.512 0 .98.136 1.4.41l-.213.476a2.726 2.726 0 00-1.064-.23c-.283 0-.502.068-.654.206a.685.685 0 00-.248.524c0 .328.234.61.666.85.393.215 1.187.67 1.187.67.433.305.648.63.648 1.168zm9.382-5.852c-.535-.014-.95.04-1.297.188-.1.04-.26.04-.274.167.055.053.063.14.11.214.08.134.218.313.346.407.14.11.28.216.427.31.26.16.555.255.81.416.145.094.293.213.44.313.073.05.12.14.214.172v-.02c-.046-.06-.06-.147-.105-.214-.067-.067-.134-.127-.2-.193a3.223 3.223 0 00-.695-.675c-.214-.146-.682-.35-.77-.595l-.013-.014c.146-.013.32-.066.46-.106.227-.06.435-.047.67-.106.106-.027.213-.06.32-.094v-.06c-.12-.12-.21-.283-.334-.395a8.867 8.867 0 00-1.104-.823c-.21-.134-.476-.22-.697-.334-.08-.04-.214-.06-.26-.127-.12-.146-.19-.34-.275-.514a17.69 17.69 0 01-.547-1.163c-.12-.262-.193-.523-.34-.763-.69-1.137-1.437-1.826-2.586-2.5-.247-.14-.543-.2-.856-.274-.167-.008-.334-.02-.5-.027-.11-.047-.216-.174-.31-.235-.38-.24-1.364-.76-1.644-.072-.18.434.267.862.422 1.082.115.153.26.328.34.5.047.116.06.235.107.356.106.294.207.622.347.897.073.14.153.287.247.413.054.073.146.107.167.227-.094.136-.1.334-.154.5-.24.757-.146 1.693.194 2.25.107.166.362.534.703.393.3-.12.234-.5.32-.835.02-.08.007-.133.048-.187v.015c.094.188.188.367.274.555.206.328.566.668.867.895.16.12.287.328.487.402v-.02h-.015c-.043-.058-.1-.086-.154-.133a3.445 3.445 0 01-.35-.4 8.76 8.76 0 01-.747-1.218c-.11-.21-.202-.436-.29-.643-.04-.08-.04-.2-.107-.24-.1.146-.247.273-.32.453-.127.288-.14.642-.188 1.01-.027.007-.014 0-.027.014-.214-.052-.287-.274-.367-.46-.2-.475-.233-1.238-.06-1.785.047-.14.247-.582.167-.716-.042-.127-.174-.2-.247-.303a2.478 2.478 0 01-.24-.427c-.16-.374-.24-.788-.414-1.162-.08-.173-.22-.354-.334-.513-.127-.18-.267-.307-.368-.52-.033-.073-.08-.194-.027-.274.014-.054.042-.075.094-.09.088-.072.335.022.422.062.247.1.455.194.662.334.094.066.195.193.315.226h.14c.214.047.455.014.655.073.355.114.675.28.962.46a5.953 5.953 0 012.085 2.286c.08.154.115.295.188.455.14.33.313.663.455.982.14.315.275.636.476.897.105.14.502.213.682.286.133.06.34.115.46.188.23.14.454.3.67.454.11.076.443.243.463.378z"/>
              </svg>
            </div>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #181717 0%, #000000 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }} title="GitHub" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </div>
          </div>
          
          <div className="form-group">
            <button onClick={() => navigate("/cloneTemplates")} style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              color: 'white'
            }}>
              <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Browse Templates
              </span>
            </button>
          </div>
          
          <h5 style={{marginTop: "8px", textAlign: 'center', color: 'var(--color-primary)'}}>Clone Templates</h5>
        </div>
        )}
        
        {currentTemplates.map((card, index) => {
          const templateState = templateStates[card.templateID] || {};
          return (
              <div key={index} className="card template-card" data-tour-template={index === 0 ? "first" : undefined}>
                {card.AssignedTo !== globalValue ? (
                <div className="card-actions">
                  <button onClick={() => navigate(`/edit/${card.templateID}`)} className="delete-button" title="Edit Template" data-tour={index === 0 ? "edit-template-btn" : undefined}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="m3.99 16.854-1.314 3.504a.75.75 0 0 0 .966.965l3.503-1.314a3 3 0 0 0 1.068-.687L18.36 9.175s-.354-1.061-1.414-2.122c-1.06-1.06-2.122-1.414-2.122-1.414L4.677 15.786a3 3 0 0 0-.687 1.068zm12.249-12.63 1.383-1.383c.248-.248.579-.406.925-.348.487.08 1.232.322 1.934 1.025.703.703.945 1.447 1.025 1.934.058.346-.1.677-.348.925L19.774 7.76s-.353-1.06-1.414-2.12c-1.06-1.062-2.121-1.415-2.121-1.415z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button onClick={() => deleteConfirm(card.templateID)} className="delete-button" title="Delete Template" data-tour={index === 0 ? "delete-template-btn" : undefined}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 4.44772 8.44772 4 9 4H15C15.5523 4 16 4.44772 16 5V7M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button onClick={() => assignModal(card.templateID, card.AssignedTo, card.AssignedRole)} className="delete-button" title="Assign to Recruiter or Reviewer" data-tour={index === 0 ? "assign-template-btn" : undefined}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 8V14M17 11H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button onClick={() => configModal(card.templateID)} className="delete-button" title="Configuration" data-tour={index === 0 ? "config-template-btn" : undefined}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 6.5H16" stroke="#292D32" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 6.5H2" stroke="#292D32" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 10C11.933 10 13.5 8.433 13.5 6.5C13.5 4.567 11.933 3 10 3C8.067 3 6.5 4.567 6.5 6.5C6.5 8.433 8.067 10 10 10Z" stroke="#292D32" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 17.5H18" stroke="#292D32" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 17.5H2" stroke="#292D32" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 21C15.933 21 17.5 19.433 17.5 17.5C17.5 15.567 15.933 14 14 14C12.067 14 10.5 15.567 10.5 17.5C10.5 19.433 12.067 21 14 21Z" stroke="#292D32" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button onClick={() => { setSelectedTemplateForHistory(card); setShowHistoryModal(true); }} className="delete-button" title="View Template History" data-tour={index === 0 ? "history-template-btn" : undefined}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                ) : (
                  <>
                    {card.ApprovalStatus === 'approved' ? (
                      <div className="approved-badge" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--color-success-light, #dcfce7)',
                        color: 'var(--color-success, #16a34a)',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginBottom: '8px'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Approved on {card.ApprovedDate ? new Date(card.ApprovedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                    ) : (
                      <div className="assigned-badge">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z" fill="currentColor"/>
                          <path d="M12 14C7.59 14 4 17.59 4 22H20C20 17.59 16.41 14 12 14Z" fill="currentColor"/>
                        </svg>
                        <span className="assigned-badge-text">
                          Assigned by <span className="assigned-badge-email">{card.email}</span> as <span className="assigned-badge-role">{card.AssignedRole === 'hiring_manager' ? 'Reviewer' : 'Recruiter'}</span>
                        </span>
                      </div>
                    )}
                    {card.AssignedRole === 'hiring_manager' && card.ApprovalStatus !== 'approved' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button 
                          onClick={() => navigate(`/edit/${card.templateID}`)} 
                          className="edit-template-btn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'var(--color-primary-gradient, linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%))',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            flex: 1
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="m3.99 16.854-1.314 3.504a.75.75 0 0 0 .966.965l3.503-1.314a3 3 0 0 0 1.068-.687L18.36 9.175s-.354-1.061-1.414-2.122c-1.06-1.06-2.122-1.414-2.122-1.414L4.677 15.786a3 3 0 0 0-.687 1.068zm12.249-12.63 1.383-1.383c.248-.248.579-.406.925-.348.487.08 1.232.322 1.934 1.025.703.703.945 1.447 1.025 1.934.058.346-.1.677-.348.925L19.774 7.76s-.353-1.06-1.414-2.12c-1.06-1.062-2.121-1.415-2.121-1.415z" fill="currentColor"/>
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleApproveTemplate(card.templateID, card.email)}
                          className="approve-template-btn"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'var(--color-success, #16a34a)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            flex: 1
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Approve
                        </button>
                      </div>
                    )}
                  </>
                )}
                
                
                <p>Generate a unique test link to share with candidates</p>
                
                {templateState.uuid ? (
                  <>
                    <div className="form-group">
                      <button onClick={() => handleCopyToClipboard(card.templateID)}>
                        <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5H6C5.46957 5 4.96086 5.21071 4.58579 5.58579C4.21071 5.96086 4 6.46957 4 7V19C4 19.5304 4.21071 20.0391 4.58579 20.4142C4.96086 20.7893 5.46957 21 6 21H16C16.5304 21 17.0391 20.7893 17.4142 20.4142C17.7893 20.0391 18 19.5304 18 19V18M8 5C8 5.53043 8.21071 6.03914 8.58579 6.41421C8.96086 6.78929 9.46957 7 10 7H12C12.5304 7 13.0391 6.78929 13.4142 6.41421C13.7893 6.03914 14 5.53043 14 5M8 5C8 4.46957 8.21071 3.96086 8.58579 3.58579C8.96086 3.21071 9.46957 3 10 3H12C12.5304 3 13.0391 3.21071 13.4142 3.58579C13.7893 3.96086 14 4.46957 14 5M14 5H16C16.5304 5 17.0391 5.21071 17.4142 5.58579C17.7893 5.96086 18 6.46957 18 7V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Copy to Clipboard
                        </span>
                      </button>
                    </div>
                    <div className="form-group" style={{marginTop: '-8px'}}>
                      <button onClick={() => openSendEmailModal(card)}>
                        <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Send Email
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <button onClick={() => handleCreateTest(card.templateID)} data-tour={index === 0 ? "generate-link-btn" : undefined}>
                        {clicked === card.templateID && loading ? (
                          <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spin-animation">
                              <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Generating...
                          </span>
                        ) : (
                          <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.479 3.53087C19.552 2.60383 18.2979 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.46997L11.75 5.17997" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60706C11.7642 9.26329 11.0684 9.05886 10.3533 9.00765C9.63816 8.95643 8.92037 9.05966 8.24861 9.3102C7.57685 9.56074 6.96684 9.95296 6.45996 10.46L3.45996 13.46C2.54917 14.403 2.04519 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3961 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Generate Test Link
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="form-group" style={{marginTop: '-8px'}}>
                      <button onClick={() => openCandidateTestModal(card)}>
                        <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M17 11L19 13L23 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Candidate-Specific
                        </span>
                      </button>
                    </div>
                  </>
                )}
                <div style={{position: 'relative', display: 'inline-block', width: '100%'}}>
                  <h5 style={{marginTop: "-10px"}} className="template-name-tooltip">{card.templateName}</h5>
                  <div className="template-tooltip">{card.templateName}</div>
                </div>
                {templateState.message && (
                  <p style={{
                    color: templateState.uuid ? 'var(--color-success-text)' : 'var(--color-error-text)',
                    background: templateState.uuid ? 'var(--color-success-light)' : 'var(--color-error-light)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    marginTop: '12px'
                  }}>{templateState.message}</p>
                )}
                
                {card.ApprovalStatus === 'approved' && card.ApprovedBy && card.ApprovedBy !== globalValue ? (
                  <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-success, #16a34a)',
                    marginTop: '12px',
                    marginBottom: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    Approved by {card.ApprovedByName || card.ApprovedBy} on {card.ApprovedDate ? new Date(card.ApprovedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </p>
                ) : card.AssignedTo && card.AssignedTo !== globalValue ? (
                  <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: '12px',
                    marginBottom: '0'
                  }}>
                    Assigned to: {card.AssignedTo}
                  </p>
                ) : null}
              </div>
          );
        })}
        </>
        )}
        </div>
        {/* Pagination Controls - Outside the container grid */}
        {!loadingTemplate && templates.length > templatesPerPage && (
          <div className="pagination-wrapper" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px 50px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-bg-primary)',
              padding: '12px 20px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <span style={{ 
                fontSize: 'var(--font-size-sm)', 
                color: 'var(--color-text-muted)',
                marginRight: '8px'
              }}>
                Page {currentPage} of {totalPages} ({filteredTemplates.length} templates)
              </span>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: currentPage === 1 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                  color: currentPage === 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Previous
              </button>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {getPageNumbers().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} style={{
                      padding: '8px 4px',
                      color: 'var(--color-text-muted)'
                    }}>...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      style={{
                        minWidth: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: currentPage === page ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        background: currentPage === page ? 'var(--color-primary-light, rgba(37, 99, 235, 0.1))' : 'var(--color-bg-primary)',
                        color: currentPage === page ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        fontWeight: currentPage === page ? '600' : '400',
                        transition: 'all 0.2s ease',
                        fontSize: 'var(--font-size-sm)'
                      }}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: currentPage === totalPages ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                  color: currentPage === totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default CreateTest;
