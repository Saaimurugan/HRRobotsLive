import React, { useState, useEffect, useRef } from 'react';
import DeviceWarning from './deviceWarning.js';
import html2canvas from 'html2canvas';
import FaceDetectionPreloader from './FaceDetectionPreloader.js';

const TestSetupWizard = ({ 
  userUniqueID, 
  cameraPermission, 
  micPermission,
  clipboardPermission,
  singleScreenOnly,
  onComplete,
  onCandidateNameChange 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [candidateName, setCandidateName] = useState('');
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [photoStage, setPhotoStage] = useState('photo'); // 'photo', 'id', 'done'
  const [photoImage, setPhotoImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [hasScrolledConsent, setHasScrolledConsent] = useState(false);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [captureError, setCaptureError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const consentScrollRef = useRef(null);

  const stepTitles = [
    'System Check',
    'Test Guidelines',
    'Data Consent',
    'Identity Verification'
  ];

  // Video handling functions
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch((error) => {
            //console.error('Error playing video:', error);
          });
          setVideoReady(true);
        };
      }
    } catch (error) {
      //console.error('Error accessing webcam:', error);
    }
  };

  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
  };

  const captureImage = async (type) => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/png');
      setCaptureError(null);
      setIsCapturing(true);
      
      if (type === 'photo') {
        const result = await callApi(imageData, 'PHOTO');
        setIsCapturing(false);
        
        if (result.success) {
          setPhotoImage(imageData);
          setPhotoStage('id');
        } else {
          setCaptureError(result.message);
        }
      } else if (type === 'id') {
        const result = await callApi(imageData, 'ID');
        setIsCapturing(false);
        
        if (result.success) {
          setIdCardImage(imageData);
          setPhotoStage('done');
        } else {
          setCaptureError(result.message);
        }
      }
    }
  };

  const callApi = async (imageData, type) => {
    try {
      const response = await fetch('https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto_', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData, 
          userUniqueID, 
          outputQuality: 5,
          type: type
        }),
      });
      const data = await response.json();
      
      // Handle Lambda proxy response format (statusCode in body)
      if (data.statusCode === 400 || !response.ok) {
        const errorBody = typeof data.body === 'string' ? JSON.parse(data.body) : data;
        return { success: false, message: errorBody.message || 'Face validation failed. Please try again.' };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error calling API:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Handle video start/stop based on step and photo stage
  useEffect(() => {
    if (currentStep === 4 && (photoStage === 'photo' || photoStage === 'id')) {
      startVideo();
    } else {
      stopVideo();
    }
    return () => stopVideo();
  }, [currentStep, photoStage]);

  // Update parent with candidate name
  useEffect(() => {
    onCandidateNameChange(candidateName);
  }, [candidateName, onCandidateNameChange]);

  // Reset scroll state when entering step 3
  useEffect(() => {
    if (currentStep === 3) {
      setHasScrolledConsent(false);
    }
  }, [currentStep]);

  // Handle consent scroll detection
  const handleConsentScroll = () => {
    if (consentScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = consentScrollRef.current;
      // Check if scrolled to bottom (with 10px tolerance)
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setHasScrolledConsent(true);
      }
    }
  };

  const canProceedToStep2 = cameraPermission && micPermission && clipboardPermission && singleScreenOnly;
  const canProceedToStep3 = candidateName.length > 3 && guidelinesAccepted;
  const canProceedToStep4 = consentAccepted;
  const canStartTest = photoStage === 'done';

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Capture screenshot of entire screen on consent submission
  const captureConsentScreenshot = async () => {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        scale: 0.5
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.7);
      
      // Save the consent screenshot
      await fetch('https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto_', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData, 
          userUniqueID, 
          captureType: 'consent_screenshot',
          outputQuality: 100
        }),
      });
    } catch (error) {
      // Continue even if screenshot fails
      //console.error('Error capturing consent screenshot:', error);
    }
  };

  const handleConsentSubmit = async () => {
    if (canProceedToStep4) {
      setIsSubmittingConsent(true);
      await captureConsentScreenshot();
      setIsSubmittingConsent(false);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartTest = () => {
    if (canStartTest) {
      onComplete(true);
    }
  };

  // Styles
  const wizardContainerStyle = {
    fontFamily: "'Roboto', sans-serif",
    maxWidth: '1000px',
    width: '95%',
    margin: 'auto',
    padding: '15px',
    background: '#f9f9f9',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    marginTop: '60px',
    boxSizing: 'border-box'
  };

  const stepIndicatorStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '15px',
    gap: '8px',
    flexWrap: 'nowrap',
    padding: '0 10px',
    maxWidth: '100%',
    boxSizing: 'border-box'
  };

  const stepCircleStyle = (stepNum) => ({
    width: '32px',
    height: '32px',
    minWidth: '32px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    background: currentStep >= stepNum ? '#2563eb' : '#e0e0e0',
    color: currentStep >= stepNum ? 'white' : '#666',
    transition: 'all 0.3s ease',
    flexShrink: 0
  });

  const stepLineStyle = (stepNum) => ({
    width: '40px',
    minWidth: '20px',
    flex: '1 1 40px',
    maxWidth: '60px',
    height: '3px',
    background: currentStep > stepNum ? '#2563eb' : '#e0e0e0',
    transition: 'all 0.3s ease'
  });

  const cardStyle = {
    background: '#fff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    marginBottom: '15px'
  };

  const buttonStyle = (enabled) => ({
    backgroundColor: enabled ? 'transparent' : '#ccc',
    color: enabled ? '#2563eb' : 'white',
    border: enabled ? '2px solid #2563eb' : 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  });

  const backButtonStyle = {
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ccc',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    marginRight: '10px'
  };

  const statusBadgeStyle = (granted) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '20px',
    background: granted ? '#e8f5e9' : '#ffebee',
    color: granted ? '#2e7d32' : '#c62828',
    fontWeight: '500',
    fontSize: '13px'
  });

  return (
    <FaceDetectionPreloader showLoadingIndicator={currentStep === 4}>
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          .identity-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          @media (max-width: 600px) {
            .identity-grid {
              grid-template-columns: 1fr;
              gap: 10px;
            }
          }
        `}
      </style>
      <div style={wizardContainerStyle}>
      {/* Step Indicator */}
      <div style={stepIndicatorStyle}>
        <div style={stepCircleStyle(1)}>1</div>
        <div style={stepLineStyle(1)}></div>
        <div style={stepCircleStyle(2)}>2</div>
        <div style={stepLineStyle(2)}></div>
        <div style={stepCircleStyle(3)}>3</div>
        <div style={stepLineStyle(3)}></div>
        <div style={stepCircleStyle(4)}>4</div>
      </div>

      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>
        Step {currentStep}: {stepTitles[currentStep - 1]}
      </h2>

      {/* Step 1: Camera & Mic Status */}
      {currentStep === 1 && (
        <div style={cardStyle}>
          <DeviceWarning />
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '15px' }}>
            Please grant access to the camera and microphone to proceed with the test.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#333' }}>📷 Camera Permission:</span>
              <span style={statusBadgeStyle(cameraPermission)}>
                {cameraPermission === null ? '⏳ Checking...' : cameraPermission ? '✓ Granted' : '✗ Denied'}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#333' }}>🎤 Microphone Permission:</span>
              <span style={statusBadgeStyle(micPermission)}>
                {micPermission === null ? '⏳ Checking...' : micPermission ? '✓ Granted' : '✗ Denied'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#333' }}>📋 Clipboard Permission:</span>
              <span style={statusBadgeStyle(clipboardPermission)}>
                {clipboardPermission === null ? '⏳ Checking...' : clipboardPermission ? '✓ Granted' : '✗ Denied'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#333' }}>🖥️ Single Screen:</span>
              <span style={statusBadgeStyle(singleScreenOnly)}>
                {singleScreenOnly === null ? '⏳ Checking...' : singleScreenOnly ? '✓ Single Screen' : '✗ Multiple Screens Detected'}
              </span>
            </div>
          </div>

          {!canProceedToStep2 && (
            <div className="system-check-alert" style={{ marginTop: '15px' }}>
              <div className="alert-title">System Requirements Not Met</div>
              <div className="alert-content">
                <div style={{ marginBottom: '8px' }}>
                  <span className="alert-highlight">Camera, microphone, clipboard access, and single screen are required to continue.</span>
                </div>
                {singleScreenOnly === false && (
                  <div style={{ marginTop: '6px', fontSize: '14px' }}>
                    <span className="alert-highlight">Please disconnect additional monitors/screens to proceed.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: '15px', textAlign: 'right' }}>
            <button 
              style={buttonStyle(canProceedToStep2)} 
              onClick={handleNext}
              disabled={!canProceedToStep2}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Test Guidelines with Name */}
      {currentStep === 2 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', color: '#444', marginBottom: '10px' }}>Test Guidelines</h3>
          <p style={{ marginBottom: '10px', fontSize: '14px' }}>
            <b>Once the test begins, please follow these rules. The test can be <span style={{color:'red'}}>terminated</span> for:</b>
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: '#555', fontSize: '13px', marginBottom: '15px' }}>
            <li>Keep your camera on at all times and do not block or deny access.</li>
            <li>Keep your microphone on at all times and do not block or deny access.</li>
            <li>Fullscreen mode must remain enabled throughout the test; do not exit fullscreen.</li>
            <li>Do not open or switch to any other window; the test window must remain in focus.</li>
            <li>Ensure your face is fully visible on the camera at all times.</li>
            <li>The proctor may capture photographs at random during the test.</li>
            <li>The proctor may capture photographs at random during the test.</li>
            <li>Taking screenshots during the test will result in immediate termination.</li>
          </ul>

          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Enter your full name (minimum 4 characters):
            </label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
            {candidateName.length > 0 && candidateName.length <= 3 && (
              <p style={{ color: '#c62828', fontSize: '12px', marginTop: '4px' }}>
                Name must be at least 4 characters
              </p>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '14px',
              color: '#333'
            }}>
              <input
                type="checkbox"
                checked={guidelinesAccepted}
                onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '8px',
                  cursor: 'pointer',
                  accentColor: '#1CBBB4'
                }}
              />
              I have read and accept all the above instructions
            </label>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
            <button style={backButtonStyle} onClick={handleBack}>
              ← Back
            </button>
            <button 
              style={buttonStyle(canProceedToStep3)} 
              onClick={handleNext}
              disabled={!canProceedToStep3}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Data Consent */}
      {currentStep === 3 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '14px', color: '#444', marginBottom: '4px', textAlign: 'center' }}>
            Consent for Collection, Use, and Sharing of Photo & ID Proof
          </h3>
          <p style={{ fontSize: '10px', color: '#666', textAlign: 'center', marginBottom: '8px' }}>
            (As per GDPR and Digital Personal Data Protection Act, 2023 – India)
          </p>
          
          <div 
            ref={consentScrollRef}
            onScroll={handleConsentScroll}
            style={{ 
            maxHeight: '180px', 
            overflowY: 'auto', 
            padding: '10px', 
            background: '#fafafa', 
            borderRadius: '6px',
            border: '1px solid #e0e0e0',
            fontSize: '11px',
            lineHeight: '1.5',
            color: '#444'
          }}>
            <p style={{ marginBottom: '8px' }}>
              By clicking "I Agree & Submit", I provide my free, specific, informed, and unambiguous consent and acknowledge that:
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '4px', marginTop: '8px', fontSize: '12px' }}>Purpose of Processing</h4>
            <p style={{ marginBottom: '8px' }}>
              I am voluntarily submitting my photograph and government ID card for recruitment, identity verification, and background validation.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '4px', marginTop: '8px', fontSize: '12px' }}>Data Fiduciary / Controller</h4>
            <p style={{ marginBottom: '8px' }}>
              HRrobots shall act as the Data Fiduciary (under DPDP Act, 2023) and Data Controller (under GDPR) for processing my personal data.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '4px', marginTop: '8px', fontSize: '12px' }}>Lawful Processing & Consent</h4>
            <ul style={{ paddingLeft: '16px', marginBottom: '8px' }}>
              <li>I consent to HRrobots collecting, storing, using, and sharing my personal data strictly for the purpose stated above.</li>
              <li>I authorize HRrobots to share my photo and ID proof with authorized recruiters and hiring organizations.</li>
            </ul>

            <h4 style={{ color: '#1CBBB4', marginBottom: '4px', marginTop: '8px', fontSize: '12px' }}>Data Retention & Security</h4>
            <p style={{ marginBottom: '8px' }}>
              Documents will be retained for up to 90 days or until completion of recruitment. HRrobots will implement reasonable security safeguards.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '4px', marginTop: '8px', fontSize: '12px' }}>Your Rights</h4>
            <p style={{ marginBottom: '8px' }}>
              You have the right to access, correct, erase your data, and withdraw consent. Contact <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a>.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '4px', marginTop: '8px', fontSize: '12px' }}>Declaration</h4>
            <p style={{ marginBottom: '8px' }}>
              I confirm that the documents submitted are authentic and belong to me.
            </p>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              cursor: hasScrolledConsent ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              color: hasScrolledConsent ? '#333' : '#999',
              padding: '8px',
              background: consentAccepted ? '#e8f5e9' : '#fff',
              border: consentAccepted ? '2px solid #1CBBB4' : '1px solid #e0e0e0',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              opacity: hasScrolledConsent ? 1 : 0.6
            }}>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => hasScrolledConsent && setConsentAccepted(e.target.checked)}
                disabled={!hasScrolledConsent}
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '8px',
                  marginTop: '1px',
                  cursor: hasScrolledConsent ? 'pointer' : 'not-allowed',
                  accentColor: '#1CBBB4',
                  flexShrink: 0
                }}
              />
              <span>
                I have read and understood this notice and give my consent to the processing of my personal data.
              </span>
            </label>
            {!hasScrolledConsent && (
              <p style={{ 
                color: '#ff9800', 
                fontSize: '11px', 
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚠️ Please scroll through the consent text to enable this checkbox
              </p>
            )}
          </div>

          <div style={{ 
            marginTop: '8px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '15px',
            fontSize: '11px'
          }}>
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#1CBBB4', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/data-protection-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#1CBBB4', textDecoration: 'none' }}>Data Protection Policy</a>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <button style={backButtonStyle} onClick={handleBack}>
              Cancel
            </button>
            <button 
              style={buttonStyle(canProceedToStep4 && !isSubmittingConsent)} 
              onClick={handleConsentSubmit}
              disabled={!canProceedToStep4 || isSubmittingConsent}
            >
              {isSubmittingConsent ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #fff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px',
                    verticalAlign: 'middle'
                  }}></span>
                  Submitting...
                </>
              ) : (
                'I Agree & Submit →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Photo & ID Capture - Two Column Layout */}
      {currentStep === 4 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', color: '#444', marginBottom: '10px', textAlign: 'center' }}>
            Capture Your Photo and Government ID
          </h3>
          
          {/* Two Column Layout */}
          <div className="identity-grid" style={{ marginBottom: '10px' }}>
            {/* Left Column - Face Capture */}
            <div style={{ 
              padding: '10px', 
              background: '#f9f9f9', 
              borderRadius: '8px',
              border: photoStage === 'photo' ? '2px solid #2563eb' : (photoImage ? '2px solid #2e7d32' : '1px solid #e0e0e0')
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '8px',
                padding: '4px 10px',
                background: photoImage ? '#e8f5e9' : (photoStage === 'photo' ? '#e3f2fd' : '#fff'),
                borderRadius: '15px',
                width: 'fit-content',
                margin: '0 auto 8px auto'
              }}>
                {photoImage ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2e7d32">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={photoStage === 'photo' ? '#2563eb' : '#666'}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
                <span style={{ fontWeight: '500', fontSize: '12px', color: photoImage ? '#2e7d32' : (photoStage === 'photo' ? '#2563eb' : '#666') }}>
                  {photoImage ? 'Photo Captured' : '4a. Capture Photo'}
                </span>
              </div>
              <div style={{ position: 'relative', width: '100%', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                {photoImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={photoImage} alt="Your Photo" style={{ height: '130px', borderRadius: '6px', border: '2px solid #1CBBB4' }} />
                    {photoStage === 'done' && (
                      <button onClick={() => { setPhotoStage('photo'); setPhotoImage(null); setIdCardImage(null); }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>×</button>
                    )}
                  </div>
                ) : photoStage === 'photo' ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', borderRadius: '6px', background: '#000', objectFit: 'cover' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {videoReady && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', border: '2px dashed #FF5722', borderRadius: '50%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: '#FF5722', fontWeight: 'bold', fontSize: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '3px' }}>Align face</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#ccc"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span style={{ fontSize: '9px', color: '#999' }}>Waiting</span>
                  </div>
                )}
              </div>
              {videoReady && photoStage === 'photo' && (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => captureImage('photo')} disabled={isCapturing} style={{ padding: '6px 14px', backgroundColor: isCapturing ? '#ccc' : '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: isCapturing ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                    {isCapturing ? 'Validating...' : 'Capture'}
                  </button>
                  {captureError && photoStage === 'photo' && (
                    <p style={{ color: '#c62828', fontSize: '11px', marginTop: '6px', background: '#ffebee', padding: '6px 10px', borderRadius: '4px' }}>
                      ⚠️ {captureError}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - ID Card Capture */}
            <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px', border: photoStage === 'id' ? '2px solid #2563eb' : (idCardImage ? '2px solid #2e7d32' : '1px solid #e0e0e0') }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px', padding: '4px 10px', background: idCardImage ? '#e8f5e9' : (photoStage === 'id' ? '#e3f2fd' : '#fff'), borderRadius: '15px', width: 'fit-content', margin: '0 auto 8px auto' }}>
                {idCardImage ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2e7d32"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={photoStage === 'id' ? '#2563eb' : '#666'}><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 4h16v8H4v-8z"/></svg>
                )}
                <span style={{ fontWeight: '500', fontSize: '12px', color: idCardImage ? '#2e7d32' : (photoStage === 'id' ? '#2563eb' : '#666') }}>
                  {idCardImage ? 'ID Captured' : '4b. Capture ID'}
                </span>
              </div>
              <div style={{ position: 'relative', width: '100%', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                {idCardImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={idCardImage} alt="ID Card" style={{ height: '100px', borderRadius: '6px', border: '2px solid #1CBBB4' }} />
                    <button onClick={() => { setPhotoStage('id'); setIdCardImage(null); }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ff4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>×</button>
                  </div>
                ) : photoStage === 'id' ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <video ref={videoRef} style={{ width: '100%', height: '100%', borderRadius: '6px', background: '#000', objectFit: 'cover' }} />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {videoReady && (
                      <div style={{ position: 'absolute', top: '5%', left: '10%', width: '80%', height: '90%', border: '2px dashed #FF5722', borderRadius: '6px', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: '#FF5722', fontWeight: 'bold', fontSize: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '3px' }}>Align ID</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ width: '100px', height: '65px', borderRadius: '6px', border: '2px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#ccc"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 4h16v8H4v-8z"/></svg>
                    <span style={{ fontSize: '9px', color: '#999' }}>Waiting</span>
                  </div>
                )}
              </div>
              {videoReady && photoStage === 'id' && (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={() => captureImage('id')} disabled={isCapturing} style={{ padding: '6px 14px', backgroundColor: isCapturing ? '#ccc' : '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: isCapturing ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 4h16v8H4v-8z"/></svg>
                    {isCapturing ? 'Validating...' : 'Capture'}
                  </button>
                  {captureError && photoStage === 'id' && (
                    <p style={{ color: '#c62828', fontSize: '11px', marginTop: '6px', background: '#ffebee', padding: '6px 10px', borderRadius: '4px' }}>
                      ⚠️ {captureError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {photoStage === 'done' && (
            <div style={{ padding: '8px', background: '#e8f5e9', borderRadius: '6px', textAlign: 'center', marginBottom: '10px' }}>
              <p style={{ color: '#2e7d32', fontWeight: '500', fontSize: '13px', margin: 0 }}>✓ Identity verification complete!</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button style={backButtonStyle} onClick={handleBack}>← Back</button>
            <button style={buttonStyle(canStartTest)} onClick={handleStartTest} disabled={!canStartTest}>Start Test</button>
          </div>
        </div>
      )}
    </div>
    </FaceDetectionPreloader>
  );
};

export default TestSetupWizard;
