import React, { createContext, useContext, useState, useEffect } from "react";

const GlobalContext = createContext();
const SESSION_KEY = "userSession";
const JWT_SESSION_KEY = "jwtSession";
const REDIRECT_PATH_KEY = "redirectPath";

export const GlobalProvider = ({ children }) => {
  const [globalValue, setGlobalValue] = useState(() => {
    // Initialize from sessionStorage if available (persists during session)
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored || "";
  });

  const [JWTValue, setJWTValue] = useState(() => {
    // Initialize from sessionStorage if available (persists during session)
    const stored = sessionStorage.getItem(JWT_SESSION_KEY);
    return stored || "";
  });

  const [redirectPath, setRedirectPath] = useState(() => {
    const stored = sessionStorage.getItem(REDIRECT_PATH_KEY);
    return stored || "";
  });

  // Sync globalValue to sessionStorage whenever it changes
  useEffect(() => {
    if (globalValue) {
      sessionStorage.setItem(SESSION_KEY, globalValue);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [globalValue]);

  // Sync JWTValue to sessionStorage whenever it changes
  useEffect(() => {
    if (JWTValue) {
      sessionStorage.setItem(JWT_SESSION_KEY, JWTValue);
    } else {
      sessionStorage.removeItem(JWT_SESSION_KEY);
    }
  }, [JWTValue]);

  // Sync redirectPath to sessionStorage whenever it changes
  useEffect(() => {
    if (redirectPath) {
      sessionStorage.setItem(REDIRECT_PATH_KEY, redirectPath);
    } else {
      sessionStorage.removeItem(REDIRECT_PATH_KEY);
    }
  }, [redirectPath]);

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!globalValue || !!sessionStorage.getItem(SESSION_KEY);
  };

  // Logout function - clears session
  const logout = () => {
    setGlobalValue("");
    setJWTValue("");
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(JWT_SESSION_KEY);
  };

  // Get and clear redirect path (used after login)
  const getAndClearRedirectPath = () => {
    const path = redirectPath || sessionStorage.getItem(REDIRECT_PATH_KEY) || "/list";
    setRedirectPath("");
    sessionStorage.removeItem(REDIRECT_PATH_KEY);
    return path;
  };

  return (
    <GlobalContext.Provider value={{ 
      globalValue, setGlobalValue, 
      JWTValue, setJWTValue, 
      isAuthenticated, logout,
      redirectPath, setRedirectPath, getAndClearRedirectPath
    }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
