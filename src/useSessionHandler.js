import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalContext } from './globalContext';

/**
 * Custom hook to handle API responses and session timeout
 * Returns a function that checks API response for unauthorized access
 * and handles session timeout by redirecting to login
 */
export const useSessionHandler = (showToast) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, setRedirectPath } = useGlobalContext();

  const handleSessionTimeout = useCallback(() => {
    // Save current path for redirect after login
    setRedirectPath(location.pathname);
    
    // Show toast notification
    if (showToast) {
      showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
    }
    
    // Clear session and redirect to login
    logout();
    
    // Small delay to allow toast to show
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  }, [navigate, location.pathname, logout, setRedirectPath, showToast]);

  /**
   * Check if API response indicates unauthorized access
   * @param {Object} data - The API response data
   * @returns {boolean} - True if unauthorized, false otherwise
   */
  const checkUnauthorized = useCallback((data) => {
    // Check various unauthorized response patterns
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      handleSessionTimeout();
      return true;
    }
    
    // Also check parsed body
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized") {
          handleSessionTimeout();
          return true;
        }
      } catch (e) {
        // Body is not JSON, continue
      }
    }
    
    return false;
  }, [handleSessionTimeout]);

  return { checkUnauthorized, handleSessionTimeout };
};

export default useSessionHandler;
