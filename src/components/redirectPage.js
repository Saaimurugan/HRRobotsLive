import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RedirectPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the home page
    navigate('/login');
  }, [navigate]);

  return (
    <div>
      <p>Redirecting...</p>
    </div>
  );
};

export default RedirectPage;
