import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

// Split contexts for better performance
const AuthContext = createContext();
const NavigationContext = createContext();

const SESSION_KEY = "userSession";
const JWT_SESSION_KEY = "jwtSession";
const REDIRECT_PATH_KEY = "redirectPath";

// Auth Provider - handles user authentication state
export const AuthProvider = ({ children }) => {
  const [globalValue, setGlobalValue] = useState(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored || "";
  });

  const [JWTValue, setJWTValue] = useState(() => {
    const stored = sessionStorage.getItem(JWT_SESSION_KEY);
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

  // Memoize functions to prevent unnecessary re-renders
  const isAuthenticated = useCallback(() => {
    return !!globalValue || !!sessionStorage.getItem(SESSION_KEY);
  }, [globalValue]);

  const logout = useCallback(() => {
    setGlobalValue("");
    setJWTValue("");
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(JWT_SESSION_KEY);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    globalValue,
    setGlobalValue,
    JWTValue,
    setJWTValue,
    isAuthenticated,
    logout
  }), [globalValue, JWTValue, isAuthenticated, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Navigation Provider - handles redirect paths
export const NavigationProvider = ({ children }) => {
  const [redirectPath, setRedirectPath] = useState(() => {
    const stored = sessionStorage.getItem(REDIRECT_PATH_KEY);
    return stored || "";
  });

  // Sync redirectPath to sessionStorage whenever it changes
  useEffect(() => {
    if (redirectPath) {
      sessionStorage.setItem(REDIRECT_PATH_KEY, redirectPath);
    } else {
      sessionStorage.removeItem(REDIRECT_PATH_KEY);
    }
  }, [redirectPath]);

  const getAndClearRedirectPath = useCallback(() => {
    const path = redirectPath || sessionStorage.getItem(REDIRECT_PATH_KEY) || "/list";
    setRedirectPath("");
    sessionStorage.removeItem(REDIRECT_PATH_KEY);
    return path;
  }, [redirectPath]);

  // Memoize context value
  const contextValue = useMemo(() => ({
    redirectPath,
    setRedirectPath,
    getAndClearRedirectPath
  }), [redirectPath, getAndClearRedirectPath]);

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

// Combined Provider for backward compatibility
export const GlobalProvider = ({ children }) => {
  return (
    <AuthProvider>
      <NavigationProvider>
        {children}
      </NavigationProvider>
    </AuthProvider>
  );
};

// Hooks for accessing contexts
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Legacy hook for backward compatibility
export const useGlobalContext = () => {
  const auth = useAuth();
  const navigation = useNavigation();
  
  return {
    ...auth,
    ...navigation
  };
};
