import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalContext } from './globalContext';

/**
 * Custom hook to handle API responses and session timeout.
 * Handles both 401 (session expired) and 403 (forbidden) — showing a toast,
 * clearing the session and navigating to /login.
 */
export const useSessionHandler = (showToast) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, setRedirectPath } = useGlobalContext();

  const handleSessionTimeout = useCallback(() => {
    setRedirectPath(location.pathname);
    if (showToast) {
      showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
    }
    logout();
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  }, [navigate, location.pathname, logout, setRedirectPath, showToast]);

  const handleForbidden = useCallback(() => {
    setRedirectPath(location.pathname);
    if (showToast) {
      showToast('error', 'Access Denied', 'You do not have permission to perform this action. Please log in again.');
    }
    logout();
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  }, [navigate, location.pathname, logout, setRedirectPath, showToast]);

  /**
   * Check the raw fetch Response object's HTTP status before parsing the body.
   * Call this immediately after fetch(), before .json().
   * Returns true if the request was blocked (401 or 403) and session was terminated.
   * @param {Response} response - The raw fetch Response object
   * @returns {boolean}
   */
  const checkHttpStatus = useCallback((response) => {
    if (response.status === 401) {
      handleSessionTimeout();
      return true;
    }
    if (response.status === 403) {
      handleForbidden();
      return true;
    }
    return false;
  }, [handleSessionTimeout, handleForbidden]);

  /**
   * Check the parsed JSON response body for 401/403 indicators.
   * Use this after .json() as a second safety net for APIs that return
   * 200 HTTP status but encode the error in the body (Lambda proxy pattern).
   * @param {Object} data - The parsed JSON response body
   * @returns {boolean}
   */
  const checkUnauthorized = useCallback((data) => {
    // 401 patterns in body
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      handleSessionTimeout();
      return true;
    }

    // 403 patterns in body
    if (data?.statusCode === 403 ||
        data?.message === "Forbidden" ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Forbidden"'))) {
      handleForbidden();
      return true;
    }

    // Check inside parsed body string (Lambda proxy double-encoding)
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized" || parsedBody?.statusCode === 401) {
          handleSessionTimeout();
          return true;
        }
        if (parsedBody?.message === "Forbidden" || parsedBody?.statusCode === 403) {
          handleForbidden();
          return true;
        }
      } catch (e) {
        // Body is not JSON, continue
      }
    }

    return false;
  }, [handleSessionTimeout, handleForbidden]);

  return { checkUnauthorized, checkHttpStatus, handleSessionTimeout, handleForbidden };
};

export default useSessionHandler;
