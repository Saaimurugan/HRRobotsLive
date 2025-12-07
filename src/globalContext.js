import React, { createContext, useContext, useState } from "react";

const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [globalValue, setGlobalValue] = useState("");

  return (
    <GlobalContext.Provider value={{ globalValue, setGlobalValue }}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
