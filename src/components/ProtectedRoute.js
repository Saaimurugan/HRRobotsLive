import React from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalContext } from '../globalContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useGlobalContext();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
