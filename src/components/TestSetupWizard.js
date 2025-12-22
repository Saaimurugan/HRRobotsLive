import React, { useState, useEffect, useRef } from 'react';
import DeviceWarning from './deviceWarning.js';

const TestSetupWizard = ({ 
  userUniqueID, 
  cameraPermission, 
  micPermission, 
  onComplete,
  onCandidateNameChange 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [candidateName, setCandidateName] = useState('');
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [photoStage, setPhotoStage] = useState('photo'); // 'photo', 'id', 'done'
  const [photoImage, setPhotoImage] = useState(null);
  const [idCardImage, setIdCardImage] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const stepTitles = [
    'Camera & Microphone Status',
    'Test Guidelines',
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
            console.error('Error playing video:', error);
          });
          setVideoReady(true);
        };
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
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
        body: JSON.stringify({ image: imageData, userUniqueID }),
      });
    } catch (error) {
      console.error('Error calling API:', error);
    }
  };

  // Handle video start/stop based on step and photo stage
  useEffect(() => {
    if (currentStep === 3 && (photoStage === 'photo' || photoStage === 'id')) {
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

  const canProceedToStep2 = cameraPermission && micPermission;
  const canProceedToStep3 = candidateName.length > 3 && guidelinesAccepted;
  const canStartTest = photoStage === 'done';

  const handleNext = () => {
    if (currentStep < 3) {
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
    background: currentStep >= stepNum ? '#1CBBB4' : '#e0e0e0',
    color: currentStep >= stepNum ? 'white' : '#666',
    transition: 'all 0.3s ease'
  });

  const stepLineStyle = (stepNum) => ({
    width: '60px',
    height: '4px',
    background: currentStep > stepNum ? '#1CBBB4' : '#e0e0e0',
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
    backgroundColor: enabled ? '#1CBBB4' : '#ccc',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '16px',
    fontWeight: '500',
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
    <div style={wizardContainerStyle}>
      {/* Step Indicator */}
      <div style={stepIndicatorStyle}>
        <div style={stepCircleStyle(1)}>1</div>
        <div style={stepLineStyle(1)}></div>
        <div style={stepCircleStyle(2)}>2</div>
        <div style={stepLineStyle(2)}></div>
        <div style={stepCircleStyle(3)}>3</div>
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
          </div>

          {!canProceedToStep2 && (
            <p style={{ color: '#c62828', marginTop: '20px', fontSize: '14px' }}>
              ⚠️ Both camera and microphone access are required to continue.
            </p>
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

      {/* Step 3: Photo & ID Capture */}
      {currentStep === 3 && (
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
              background: photoStage === 'photo' ? '#1CBBB4' : (photoImage ? '#e8f5e9' : '#e0e0e0'),
              color: photoStage === 'photo' ? 'white' : (photoImage ? '#2e7d32' : '#666'),
              fontWeight: '500'
            }}>
              {photoImage ? '✓' : '3a.'} Capture Photo
            </span>
            <span style={{ 
              padding: '8px 16px', 
              borderRadius: '20px',
              background: photoStage === 'id' ? '#1CBBB4' : (idCardImage ? '#e8f5e9' : '#e0e0e0'),
              color: photoStage === 'id' ? 'white' : (idCardImage ? '#2e7d32' : '#666'),
              fontWeight: '500'
            }}>
              {idCardImage ? '✓' : '3b.'} Capture ID Card
            </span>
          </div>

          {/* Video Preview */}
          {photoStage !== 'done' && (
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <video ref={videoRef} style={{ width: '80%', borderRadius: '8px', background: '#000' }} />
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

          {/* Capture Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {videoReady && photoStage === 'photo' && (
              <button
                onClick={() => captureImage('photo')}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#007BFF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                📸 Capture Photo
              </button>
            )}

            {videoReady && photoStage === 'id' && (
              <button
                onClick={() => captureImage('id')}
                style={{
                  padding: '12px 30px',
                  backgroundColor: '#28A745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🪪 Capture ID Card
              </button>
            )}
          </div>

          {/* Captured Images Preview */}
          {(photoImage || idCardImage) && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              {photoImage && (
                <div style={{ textAlign: 'center', position: 'relative' }}>
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
                </div>
              )}
              
              {idCardImage && (
                <div style={{ textAlign: 'center', position: 'relative' }}>
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
                </div>
              )}
            </div>
          )}

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
  );
};

export default TestSetupWizard;
