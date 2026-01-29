/**
 * Utility functions for logging template history
 */


/**
 * Log template history event
 * @param {string} templateID - The template ID
 * @param {string} action - The action type (created, assigned_for_review, approved, modified, assigned_to_recruiter)
 * @param {string} performedBy - Email of the person performing the action
 * @param {string} performedByName - Name of the person performing the action
 * @param {object} details - Additional details about the action
 */
export const logTemplateHistory = async (templateID, action, performedBy, performedByName, details = {}) => {
  try {
    const response = await fetch(`https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/logTemplateHistory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateID,
        action,
        performedBy,
        performedByName,
        details
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to log template history:', data);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error logging template history:', error);
    return false;
  }
};

/**
 * Log template creation
 */
export const logTemplateCreation = async (templateID, creatorEmail, creatorName) => {
  return await logTemplateHistory(
    templateID,
    'created',
    creatorEmail,
    creatorName,
    {}
  );
};

/**
 * Log template assignment for review
 */
export const logTemplateAssignmentForReview = async (
  templateID,
  assignerEmail,
  assignerName,
  assignedToEmail,
  assignedToName,
  assignedRole
) => {
  return await logTemplateHistory(
    templateID,
    'assigned_for_review',
    assignerEmail,
    assignerName,
    {
      assignedTo: assignedToEmail,
      assignedToName: assignedToName,
      assignedRole: assignedRole
    }
  );
};

/**
 * Log template approval
 */
export const logTemplateApproval = async (
  templateID,
  approverEmail,
  approverName,
  comments = ''
) => {
  return await logTemplateHistory(
    templateID,
    'approved',
    approverEmail,
    approverName,
    {
      approverComments: comments
    }
  );
};

/**
 * Log template modification
 */
export const logTemplateModification = async (
  templateID,
  modifierEmail,
  modifierName,
  modifications = ''
) => {
  return await logTemplateHistory(
    templateID,
    'modified',
    modifierEmail,
    modifierName,
    {
      modifications: modifications
    }
  );
};

/**
 * Log template assignment to recruiter
 */
export const logTemplateAssignmentToRecruiter = async (
  templateID,
  assignerEmail,
  assignerName,
  recruiterEmail,
  recruiterName
) => {
  return await logTemplateHistory(
    templateID,
    'assigned_to_recruiter',
    assignerEmail,
    assignerName,
    {
      assignedTo: recruiterEmail,
      assignedToName: recruiterName
    }
  );
};

/**
 * Log template configuration changes
 */
export const logTemplateConfigurationChange = async (
  templateID,
  changerEmail,
  changerName,
  configChanges
) => {
  return await logTemplateHistory(
    templateID,
    'configuration_changed',
    changerEmail,
    changerName,
    {
      configChanges: configChanges
    }
  );
};
