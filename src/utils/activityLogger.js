/**
 * Activity Logger Utility
 * Logs user activities to the backend for tracking and analytics
 */

const ACTIVITY_LOG_ENDPOINT = 'https://boy6gvghjj.execute-api.us-east-1.amazonaws.com/dev/logActivity';

/**
 * Log an activity to the backend
 * @param {string} email - User email
 * @param {string} activity - Activity type (CreateJD, ProfilerPage, CandidateSpecificTest)
 * @param {string} action - Action type (form_submitted, report_generated, test_created, etc.)
 * @param {object} details - Additional details about the activity
 * @param {string} token - JWT token for authentication
 */
export const logActivity = async (email, activity, action, details = {}, token) => {
  try {
    if (!email || !activity || !action) {
      console.warn('[ActivityLogger] Missing required fields for logging');
      return;
    }

    const payload = {
      email,
      activity,
      action,
      details: {
        ...details,
        timestamp: new Date().toISOString()
      },
      token
    };

    console.log('[ActivityLogger] Logging activity:', { email, activity, action });

    const response = await fetch(ACTIVITY_LOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn('[ActivityLogger] Failed to log activity:', response.status);
      return;
    }

    const data = await response.json();
    console.log('[ActivityLogger] Activity logged successfully:', data);
    return data;
  } catch (error) {
    console.error('[ActivityLogger] Error logging activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
};

/**
 * Log CreateJD activity
 */
export const logCreateJDActivity = (email, action, details, token) => {
  return logActivity(email, 'CreateJD', action, details, token);
};

/**
 * Log ProfilerPage activity
 */
export const logProfilerPageActivity = (email, action, details, token) => {
  return logActivity(email, 'ProfilerPage', action, details, token);
};

/**
 * Log CandidateSpecificTest activity
 */
export const logCandidateTestActivity = (email, action, details, token) => {
  return logActivity(email, 'CandidateSpecificTest', action, details, token);
};

/**
 * Log Login activity
 */
export const logLoginActivity = (email, action, details, token) => {
  return logActivity(email, 'Login', action, details, token);
};

/**
 * Log Report activity
 */
export const logReportActivity = (email, action, details, token) => {
  return logActivity(email, 'Report', action, details, token);
};

/**
 * Log Logout activity
 */
export const logLogoutActivity = (email, action, details, token) => {
  return logActivity(email, 'Logout', action, details, token);
};

/**
 * Log Configuration activity
 */
export const logConfigurationActivity = (email, action, details, token) => {
  return logActivity(email, 'Configuration', action, details, token);
};

/**
 * Log Edit Template activity
 */
export const logEditTemplateActivity = (email, action, details, token) => {
  return logActivity(email, 'EditTemplate', action, details, token);
};

/**
 * Log Assign to Recruiter/Reviewer activity
 */
export const logAssignActivity = (email, action, details, token) => {
  return logActivity(email, 'Assign', action, details, token);
};

/**
 * Log Generate Test Link activity
 */
export const logGenerateTestLinkActivity = (email, action, details, token) => {
  return logActivity(email, 'GenerateTestLink', action, details, token);
};
