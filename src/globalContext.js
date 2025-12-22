import React, { createContext, useContext, useState, useEffect } from "react";

const GlobalContext = createContext();
const SESSION_KEY = "userSession";

export const GlobalProvider = ({ children }) => {
  const [globalValue, setGlobalValue] = useState(() => {
    // Initialize from sessionStorage if available (persists during session)
    const stored = sessionStorage.getItem(SESSION_KEY);
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

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!globalValue || !!sessionStorage.getItem(SESSION_KEY);
  };

  // Logout function - clears session
  const logout = () => {
    setGlobalValue("");
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <GlobalContext.Provider value={{ globalValue, setGlobalValue, isAuthenticated, logout }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
