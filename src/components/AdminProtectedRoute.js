import React from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalContext } from '../globalContext';

const ADMIN_EMAIL = 'saaimurugan@gmail.com';

const AdminProtectedRoute = ({ children }) => {
  const { globalValue, isAuthenticated } = useGlobalContext();

  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin
  if (!globalValue || globalValue.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return <Navigate to="/list" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
