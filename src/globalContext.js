import React, { createContext, useContext, useState, useEffect } from "react";

const GlobalContext = createContext();
const STORAGE_KEY = "globalAPIValue";

export const GlobalProvider = ({ children }) => {
  const [globalValue, setGlobalValue] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      localStorage.removeItem(STORAGE_KEY); // Clear after restoring
      return stored;
    }
    return "";
  });

  useEffect(() => {
    // Save to localStorage before page unload (refresh/close)
    const handleBeforeUnload = () => {
      if (globalValue) {
        localStorage.setItem(STORAGE_KEY, globalValue);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [globalValue]);

  return (
    <GlobalContext.Provider value={{ globalValue, setGlobalValue }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
