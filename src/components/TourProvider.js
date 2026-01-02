import React, { useState, useEffect, createContext, useContext } from 'react';
import { useGlobalContext } from '../globalContext';
import ProductTour from './ProductTour';
import '../ProductTour.css';

const TourContext = createContext();

export const useTour = () => useContext(TourContext);

const WelcomeModal = ({ onStartTour, onSkip }) => {
  return (
    <div className="welcome-modal-overlay">
      <div className="welcome-modal">
        <div className="welcome-modal-header">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h2>Welcome to HR Robots!</h2>
          <p>Your AI-powered hiring assistant</p>
        </div>
        
        <div className="welcome-modal-content">
          <p>
            We're excited to have you here! Would you like a quick tour to help you get started?
          </p>
          
          <div className="welcome-features">
            <div className="welcome-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span>Create AI-powered job descriptions</span>
            </div>
            <div className="welcome-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
              <span>Profile candidates with AI analysis</span>
            </div>
            <div className="welcome-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <span>Create screening tests with AI questions</span>
            </div>
            <div className="welcome-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>View detailed analytics and results</span>
            </div>
          </div>
        </div>
        
        <div className="welcome-modal-actions">
          <button className="welcome-btn-secondary" onClick={onSkip}>
            Skip for now
          </button>
          <button className="welcome-btn-primary" onClick={onStartTour}>
            Take the Tour
          </button>
        </div>
      </div>
    </div>
  );
};

const StartTourButton = ({ onClick }) => {
  return (
    <button className="start-tour-btn" onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      Take a Tour
    </button>
  );
};

export const TourProvider = ({ children }) => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isNewUser, setIsNewUser] = useState(null);
  const [showTourButton, setShowTourButton] = useState(false);
  const { globalValue, JWTValue } = useGlobalContext();

  // Check if user is new when they log in
  useEffect(() => {
    const checkNewUser = async () => {
      if (!globalValue || !JWTValue) {
        setIsNewUser(null);
        setShowWelcome(false);
        setShowTourButton(false);
        return;
      }

      try {
        const response = await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/userUpdate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: globalValue,
            action: "get",
            token: JWTValue 
          })
        });

        const data = await response.json();
        
        if (data.statusCode === 200) {
          const userData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          const newUserStatus = userData?.newUser;
          
          // If newUser field doesn't exist or is "yes", show welcome
          if (newUserStatus === undefined || newUserStatus === "yes" || newUserStatus === true) {
            setIsNewUser(true);
            setShowWelcome(true);
            setShowTourButton(false);
          } else {
            setIsNewUser(false);
            setShowWelcome(false);
            setShowTourButton(true);
          }
        } else {
          // If user details not found, assume new user
          setIsNewUser(true);
          setShowWelcome(true);
          setShowTourButton(false);
        }
      } catch (error) {
        // console.error("Error checking user status:", error);
        // On error, show tour button as fallback
        setShowTourButton(true);
      }
    };

    checkNewUser();
  }, [globalValue, JWTValue]);

  const handleStartTour = () => {
    setShowWelcome(false);
    setShowTour(true);
  };

  const handleSkipWelcome = async () => {
    setShowWelcome(false);
    setShowTourButton(true);
    
    // Mark user as not new
    try {
      await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/userUpdate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: globalValue, 
          newUser: "no",
          token: JWTValue 
        })
      });
    } catch (error) {
      // console.error("Error updating user status:", error);
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    setShowTourButton(true);
    setIsNewUser(false);
  };

  const handleCloseTour = () => {
    setShowTour(false);
    setShowTourButton(true);
  };

  const startTour = () => {
    setShowTour(true);
    setShowTourButton(false);
  };

  return (
    <TourContext.Provider value={{ startTour, isNewUser }}>
      {children}
      
      {showWelcome && globalValue && (
        <WelcomeModal 
          onStartTour={handleStartTour} 
          onSkip={handleSkipWelcome} 
        />
      )}
      
      {showTour && (
        <ProductTour 
          isOpen={showTour} 
          onClose={handleCloseTour}
          onComplete={handleTourComplete}
        />
      )}
      
      {showTourButton && globalValue && !showTour && !showWelcome && (
        <StartTourButton onClick={startTour} />
      )}
    </TourContext.Provider>
  );
};

export default TourProvider;
