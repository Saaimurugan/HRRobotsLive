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
      if (type === 'photo') {
        setPhotoImage(imageData);
        setPhotoStage('id');
      } else if (type === 'id') {
        setIdCardImage(imageData);
        setPhotoStage('done');
      }
      await callApi(imageData);
    }
  };

  const callApi = async (imageData) => {
    try {
      await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, userUniqueID, outputQuality: 5 }),  // Low quality for photos/ID
      });
    } catch (error) {
      //console.error('Error calling API:', error);
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
      await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
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
    maxWidth: '650px',
    margin: 'auto',
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    marginTop: '100px'
  };

  const stepIndicatorStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '30px',
    gap: '10px'
  };

  const stepCircleStyle = (stepNum) => ({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    background: currentStep >= stepNum ? '#2563eb' : '#e0e0e0',
    color: currentStep >= stepNum ? 'white' : '#666',
    transition: 'all 0.3s ease'
  });

  const stepLineStyle = (stepNum) => ({
    width: '60px',
    height: '4px',
    background: currentStep > stepNum ? '#2563eb' : '#e0e0e0',
    transition: 'all 0.3s ease'
  });

  const cardStyle = {
    background: '#fff',
    padding: '25px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    marginBottom: '20px'
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
    padding: '8px 16px',
    borderRadius: '20px',
    background: granted ? '#e8f5e9' : '#ffebee',
    color: granted ? '#2e7d32' : '#c62828',
    fontWeight: '500',
    fontSize: '14px'
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
          <p style={{ fontSize: '16px', color: '#555', marginBottom: '20px' }}>
            Please grant access to the camera and microphone to proceed with the test.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#333' }}>📷 Camera Permission:</span>
              <span style={statusBadgeStyle(cameraPermission)}>
                {cameraPermission === null ? '⏳ Checking...' : cameraPermission ? '✓ Granted' : '✗ Denied'}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#333' }}>🎤 Microphone Permission:</span>
              <span style={statusBadgeStyle(micPermission)}>
                {micPermission === null ? '⏳ Checking...' : micPermission ? '✓ Granted' : '✗ Denied'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#333' }}>📋 Clipboard Permission:</span>
              <span style={statusBadgeStyle(clipboardPermission)}>
                {clipboardPermission === null ? '⏳ Checking...' : clipboardPermission ? '✓ Granted' : '✗ Denied'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '16px', color: '#333' }}>🖥️ Single Screen:</span>
              <span style={statusBadgeStyle(singleScreenOnly)}>
                {singleScreenOnly === null ? '⏳ Checking...' : singleScreenOnly ? '✓ Single Screen' : '✗ Multiple Screens Detected'}
              </span>
            </div>
          </div>

          {!canProceedToStep2 && (
            <div className="system-check-alert" style={{ marginTop: '20px' }}>
              <div className="alert-title">System Requirements Not Met</div>
              <div className="alert-content">
                <div style={{ marginBottom: '12px' }}>
                  <span className="alert-highlight">Camera, microphone, clipboard access, and single screen are required to continue.</span>
                </div>
                {singleScreenOnly === false && (
                  <div style={{ marginTop: '8px', fontSize: '16px' }}>
                    <span className="alert-highlight">Please disconnect additional monitors/screens to proceed.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: '25px', textAlign: 'right' }}>
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
          <h3 style={{ fontSize: '18px', color: '#444', marginBottom: '15px' }}>Test Guidelines</h3>
          <p style={{ marginBottom: '15px' }}>
            <b>Once the test begins, please follow these rules. The test can be <span style={{color:'red'}}>terminated</span> for:</b>
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: '#555' }}>
            <li>Keep your camera on at all times and do not block or deny access.</li>
            <li>Keep your microphone on at all times and do not block or deny access.</li>
            <li>Fullscreen mode must remain enabled throughout the test; do not exit fullscreen.</li>
            <li>Do not open or switch to any other window; the test window must remain in focus.</li>
            <li>Ensure your face is fully visible on the camera at all times.</li>
            <li>The proctor may capture photographs at random during the test.</li>
            <li>The proctor may capture photographs at random during the test.</li>
            <li>Taking screenshots during the test will result in immediate termination.</li>
          </ul>

          <div style={{ marginTop: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
              Enter your full name (minimum 4 characters):
            </label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            {candidateName.length > 0 && candidateName.length <= 3 && (
              <p style={{ color: '#c62828', fontSize: '13px', marginTop: '5px' }}>
                Name must be at least 4 characters
              </p>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '15px',
              color: '#333'
            }}>
              <input
                type="checkbox"
                checked={guidelinesAccepted}
                onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginRight: '10px',
                  cursor: 'pointer',
                  accentColor: '#1CBBB4'
                }}
              />
              I have read and accept all the above instructions
            </label>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
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
          <h3 style={{ fontSize: '18px', color: '#444', marginBottom: '15px', textAlign: 'center' }}>
            Consent for Collection, Use, and Sharing of Photo & ID Proof
          </h3>
          <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>
            (As per GDPR and Digital Personal Data Protection Act, 2023 – India)
          </p>
          
          <div 
            ref={consentScrollRef}
            onScroll={handleConsentScroll}
            style={{ 
            maxHeight: '350px', 
            overflowY: 'auto', 
            padding: '15px', 
            background: '#fafafa', 
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            fontSize: '14px',
            lineHeight: '1.7',
            color: '#444'
          }}>
            <p style={{ marginBottom: '15px' }}>
              By clicking "I Agree & Submit", I provide my free, specific, informed, and unambiguous consent and acknowledge that:
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Purpose of Processing</h4>
            <p style={{ marginBottom: '15px' }}>
              I am voluntarily submitting my photograph and government ID card, which constitute personal data and may include sensitive personal data, for the purpose of recruitment, identity verification, and background validation.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Data Fiduciary / Controller</h4>
            <p style={{ marginBottom: '15px' }}>
              HRrobots shall act as the Data Fiduciary (under DPDP Act, 2023) and Data Controller (under GDPR) for processing my personal data.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Lawful Processing & Consent</h4>
            <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
              <li>I consent to HRrobots collecting, storing, using, and sharing my personal data strictly for the purpose stated above.</li>
              <li>I authorize HRrobots to share my photo and ID proof with authorized recruiters, recruitment partners, and/or hiring organizations involved in evaluating my application.</li>
              <li>My personal data will not be used for any purpose other than those explicitly stated without obtaining further consent.</li>
            </ul>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Data Retention</h4>
            <p style={{ marginBottom: '15px' }}>
              My documents will be retained for a period of up to 90 days or until completion of the recruitment process, whichever is earlier, unless retention is required for a longer period under applicable law.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Data Security</h4>
            <p style={{ marginBottom: '15px' }}>
              HRrobots will implement reasonable security safeguards to protect my personal data against unauthorized access, disclosure, alteration, or misuse, in compliance with GDPR and the DPDP Act, 2023.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Rights of the Data Principal / Data Subject</h4>
            <p style={{ marginBottom: '10px' }}>I understand that I have the right to:</p>
            <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
              <li>Access my personal data</li>
              <li>Request correction or erasure of my personal data</li>
              <li>Withdraw my consent at any time</li>
              <li>Request information regarding how my data is processed</li>
            </ul>
            <p style={{ marginBottom: '15px' }}>
              I may exercise these rights by contacting <a href="mailto:bot@hrrobots.com" style={{ color: '#1CBBB4' }}>bot@hrrobots.com</a>.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Withdrawal of Consent</h4>
            <p style={{ marginBottom: '15px' }}>
              I understand that I may withdraw my consent at any time. Withdrawal will not affect the lawfulness of processing carried out prior to such withdrawal but may impact my eligibility to continue in the recruitment process.
            </p>

            <h4 style={{ color: '#1CBBB4', marginBottom: '8px', marginTop: '15px' }}>Declaration</h4>
            <p style={{ marginBottom: '15px' }}>
              I confirm that the documents submitted are authentic, belong to me, and that I am legally authorized to provide them.
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              cursor: hasScrolledConsent ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              color: hasScrolledConsent ? '#333' : '#999',
              padding: '12px',
              background: consentAccepted ? '#e8f5e9' : '#fff',
              border: consentAccepted ? '2px solid #1CBBB4' : '2px solid #e0e0e0',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              opacity: hasScrolledConsent ? 1 : 0.6
            }}>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => hasScrolledConsent && setConsentAccepted(e.target.checked)}
                disabled={!hasScrolledConsent}
                style={{
                  width: '20px',
                  height: '20px',
                  marginRight: '12px',
                  marginTop: '2px',
                  cursor: hasScrolledConsent ? 'pointer' : 'not-allowed',
                  accentColor: '#1CBBB4',
                  flexShrink: 0
                }}
              />
              <span>
                I have read and understood this notice and hereby give my consent to the processing and sharing of my personal data as described above.
              </span>
            </label>
            {!hasScrolledConsent && (
              <p style={{ 
                color: '#ff9800', 
                fontSize: '13px', 
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                ⚠️ Please scroll through the entire consent text above to enable this checkbox
              </p>
            )}
          </div>

          <div style={{ 
            marginTop: '15px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '20px',
            fontSize: '13px'
          }}>
            <a 
              href="/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1CBBB4', textDecoration: 'none' }}
            >
              Privacy Policy
            </a>
            <a 
              href="/data-protection-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1CBBB4', textDecoration: 'none' }}
            >
              Data Protection & Grievance Redressal Policy
            </a>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
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

      {/* Step 4: Photo & ID Capture */}
      {currentStep === 4 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '18px', color: '#444', marginBottom: '15px' }}>
            Capture Your Photo and Government ID
          </h3>
          
          {/* Sub-step indicator */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '20px', 
            marginBottom: '20px',
            padding: '10px',
            background: '#f5f5f5',
            borderRadius: '8px'
          }}>
            <span style={{ 
              padding: '8px 16px', 
              borderRadius: '20px',
              background: photoStage === 'photo' ? 'transparent' : (photoImage ? '#e8f5e9' : '#fff'),
              border: photoStage === 'photo' ? '2px solid #2563eb' : (photoImage ? '2px solid #2e7d32' : '2px solid #e0e0e0'),
              color: photoStage === 'photo' ? '#2563eb' : (photoImage ? '#2e7d32' : '#666'),
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {photoImage ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              )}
              {photoImage ? '' : '4a.'} Capture Photo
            </span>
            <span style={{ 
              padding: '8px 16px', 
              borderRadius: '20px',
              background: photoStage === 'id' ? 'transparent' : (idCardImage ? '#e8f5e9' : '#fff'),
              border: photoStage === 'id' ? '2px solid #2563eb' : (idCardImage ? '2px solid #2e7d32' : '2px solid #e0e0e0'),
              color: photoStage === 'id' ? '#2563eb' : (idCardImage ? '#2e7d32' : '#666'),
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {idCardImage ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 4h16v8H4v-8z"/>
                  <circle cx="7" cy="14" r="1"/>
                  <path d="M10 13h6v1h-6zm0 2h4v1h-4z"/>
                </svg>
              )}
              {idCardImage ? '' : '4b.'} Capture ID Card
            </span>
          </div>

          {/* Video Preview - Fixed height container to prevent layout shift */}
          <div style={{ 
            minHeight: photoStage !== 'done' ? '280px' : '0px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            {photoStage !== 'done' && (
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
                <video ref={videoRef} style={{ width: '80%', height: '250px', borderRadius: '8px', background: '#000', objectFit: 'cover' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {videoReady && (
                  <div style={{
                    position: 'absolute',
                    top: photoStage === 'photo' ? '15%' : '10%',
                    left: photoStage === 'photo' ? '35%' : '20%',
                    width: photoStage === 'photo' ? '30%' : '60%',
                    height: '70%',
                    border: '3px dashed #FF5722',
                    borderRadius: photoStage === 'photo' ? '50%' : '8px',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <p style={{
                      color: '#FF5722',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      textAlign: 'center',
                      background: 'rgba(255,255,255,0.8)',
                      padding: '5px 10px',
                      borderRadius: '4px'
                    }}>
                      {photoStage === 'photo' ? 'Align your face here' : 'Align your ID card here'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Capture Buttons - Fixed height container */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', minHeight: photoStage !== 'done' ? '48px' : '0px' }}>
            {videoReady && photoStage === 'photo' && (
              <button
                onClick={() => captureImage('photo')}
                style={{
                  padding: '12px 30px',
                  backgroundColor: 'transparent',
                  color: '#2563eb',
                  border: '2px solid #2563eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#2563eb';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.2l-3.14-3.14a.996.996 0 00-1.41 0c-.39.39-.39 1.02 0 1.41L12 17.99l4.55-4.52c.39-.39.39-1.02 0-1.41a.996.996 0 00-1.41 0L12 15.2z"/>
                  <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                </svg>
                Capture Photo
              </button>
            )}

            {videoReady && photoStage === 'id' && (
              <button
                onClick={() => captureImage('id')}
                style={{
                  padding: '12px 30px',
                  backgroundColor: 'transparent',
                  color: '#2563eb',
                  border: '2px solid #2563eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#2563eb';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 4h16v8H4v-8z"/>
                  <path d="M6 12h2v2H6zm0 3h8v1H6z"/>
                </svg>
                Capture ID Card
              </button>
            )}
          </div>

          {/* Captured Images Preview with Skeleton Placeholders */}
          <div style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              {/* Photo Section */}
              <div style={{ textAlign: 'center', position: 'relative' }}>
                {photoImage ? (
                  <>
                    <img src={photoImage} alt="Your Photo" style={{ 
                      width: '150px', 
                      borderRadius: '8px',
                      border: '2px solid #1CBBB4'
                    }} />
                    <p style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>Your Photo</p>
                    {photoStage === 'done' && (
                      <button
                        onClick={() => {
                          setPhotoStage('photo');
                          setPhotoImage(null);
                          setIdCardImage(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '-10px',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#ff4444',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: '1',
                          padding: '0'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  /* Photo Skeleton Placeholder */
                  <div style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '8px',
                    border: '2px dashed #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: photoStage === 'photo' ? 'shimmer 1.5s infinite' : 'none',
                    position: 'relative'
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#ccc" style={{ marginBottom: '8px' }}>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <span style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
                      {photoStage === 'photo' ? 'Capturing...' : 'Photo Placeholder'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* ID Card Section */}
              <div style={{ textAlign: 'center', position: 'relative' }}>
                {idCardImage ? (
                  <>
                    <img src={idCardImage} alt="ID Card" style={{ 
                      width: '150px', 
                      borderRadius: '8px',
                      border: '2px solid #1CBBB4'
                    }} />
                    <p style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>ID Card</p>
                    <button
                      onClick={() => {
                        setPhotoStage('id');
                        setIdCardImage(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1',
                        padding: '0'
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  /* ID Card Skeleton Placeholder */
                  <div style={{
                    width: '150px',
                    height: '95px',
                    borderRadius: '8px',
                    border: '2px dashed #ccc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: photoStage === 'id' ? 'shimmer 1.5s infinite' : 'none',
                    position: 'relative'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#ccc" style={{ marginBottom: '4px' }}>
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6h16v2H4V6zm0 4h16v8H4v-8z"/>
                      <circle cx="7" cy="14" r="1.5"/>
                      <path d="M10 13h6v1h-6zm0 2h4v1h-4z"/>
                    </svg>
                    <span style={{ fontSize: '10px', color: '#999', textAlign: 'center' }}>
                      {photoStage === 'id' ? 'Capturing...' : 'ID Placeholder'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {photoStage === 'done' && (
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: '#e8f5e9', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ color: '#2e7d32', fontWeight: '500' }}>
                ✓ Identity verification complete! You can now start the test.
              </p>
            </div>
          )}

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between' }}>
            <button style={backButtonStyle} onClick={handleBack}>
              ← Back
            </button>
            <button 
              style={buttonStyle(canStartTest)} 
              onClick={handleStartTest}
              disabled={!canStartTest}
            >
              I Accept & Start Test
            </button>
          </div>
        </div>
      )}
    </div>
    </FaceDetectionPreloader>
  );
};

export default TestSetupWizard;
