import React, { useRef, useState, useEffect } from 'react';

const VideoPreviewForPositioning = ({userUniqueID, onComplete }) => { // Add onComplete prop
   const videoRef = useRef(null);
   const canvasRef = useRef(null);
   const [stage, setStage] = useState('photo'); // 'photo', 'id', 'done'
   const [photoImage, setPhotoImage] = useState(null);
   const [idCardImage, setIdCardImage] = useState(null);
   const [videoReady, setVideoReady] = useState(false); // New state to track video readiness

   const startVideo = async () => {
      try {
         const stream = await navigator.mediaDevices.getUserMedia({ video: true });
         if (videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
               videoRef.current.play().catch((error) => {
                  //console.error('Error playing video:', error);
               });
               setVideoReady(true); // Set video as ready when metadata is loaded
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
      setVideoReady(false); // Reset video readiness when stopped
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
            if (!idCardImage) {
               setStage('id');
            }
            else {
               setStage('done');
            }
         } else if (type === 'id') {
            setIdCardImage(imageData);
            setStage('done');
            if (onComplete) {
               onComplete(true); // Notify parent with true
            }
         }
         await callApi(imageData);
      }
   };

   const callApi = async (imageData) => {
      try {
         const response = await fetch('https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData, userUniqueID, outputQuality: 5 }),  // Low quality for photos/ID
         });
         const result = await response.json();
         //console.log('API Response:', result);
      } catch (error) {
         //console.error('Error calling API:', error);
      }
   };

   useEffect(() => {
      if (stage === 'photo' || stage === 'id') {
         startVideo();
      } else {
         stopVideo();
      }

      return () => {
         stopVideo();
      };
   }, [stage]);

   return (
      <>
      <h3 style={{ fontsize: "18px", color: "#444" }}>Capture your photo and any Goverment ID</h3>
      <div style={{ position: 'relative', width: '100%', justifyContent: 'center', alignItems: 'center'}}>
         <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {stage !== 'done' && (
               <>
                  <video ref={videoRef} style={{ width: '50%' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {/* Overlay template */}
                  {videoReady && (
                     <div
                        style={{
                           position: 'absolute',
                           top: stage === 'photo' ? '28%' : '20%',
                           left: stage === 'photo' ? '40%' : '30%',
                           width: stage === 'photo' ? '20%' : '40%',
                           height: '60%',
                           border: '2px dashed #FF0000',
                           borderRadius: stage === 'photo' ? '30%' : '0%',
                           boxSizing: 'border-box',
                           pointerEvents: 'none',
                        }}
                     >
                        <p
                           style={{
                              position: 'absolute',
                              top: '35%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              color: '#FF0000',
                              fontWeight: 'bold',
                              fontSize: '60%',
                              textAlign: 'center',
                           }}
                        >
                           {stage === 'photo' ? 'Align your face here' : 'Align your ID here'}
                        </p>
                     </div>
                  )}
               </>
            )}
         </div>

         <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            {videoReady && stage === 'photo' && (
               <button
                  onClick={() => captureImage('photo')}
                  style={{
                     padding: '10px 20px',
                     backgroundColor: '#007BFF',
                     color: '#fff',
                     border: 'none',
                     borderRadius: '5px',
                     cursor: 'pointer',
                  }}
               >
                  Capture Photo
               </button>
            )}

            {stage === 'id' && (
               <button
                  onClick={() => captureImage('id')}
                  style={{
                     padding: '10px 20px',
                     backgroundColor: '#28A745',
                     color: '#fff',
                     border: 'none',
                     borderRadius: '5px',
                     cursor: 'pointer',
                  }}
               >
                  Capture ID Card
               </button>
            )}
         </div>
         <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between'}}>
         {(stage === 'id' || stage === 'done') && (
               <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', justifyContent: 'center'}}>
             <p>Candidate Photo</p>
               <img src={photoImage} alt="Photo" style={{ width: '40%' }} />
               {stage === 'done'&& (
               <button
                  onClick={() => {
                     setStage('photo');
                     setPhotoImage(null);
                  }}
                  style={{
                     padding: '10px 15px',
                     backgroundColor: '#FF0000',
                     color: '#fff',
                     border: 'none',
                     borderRadius: '50px',
                     cursor: 'pointer',
                     position: 'absolute',
                     top: '12px',
                  }}
               >
                  x
               </button>)}
               </div>
            )}
            {stage === 'done' && (
               <div style={{ display: 'flex', flexDirection: 'column-reverse',  alignItems: 'center', justifyContent: 'center'}}>
             <p>Candidate ID</p>
               <img src={idCardImage} alt="Photo" style={{ width: '40%' }} />
               {stage === 'done' && (
               <button
                  onClick={() => {
                     setStage('id');
                     setIdCardImage(null);
                  }}
                  style={{
                     padding: '10px 15px',
                     backgroundColor: '#FF0000',
                     color: '#fff',
                     border: 'none',
                     borderRadius: '50px',
                     cursor: 'pointer',
                     position: 'absolute',
                     top: '12px',
                     left: 'auto',
                  }}
               >
                  x
               </button>)}
               </div>
            )}
            </div>
         </div>
         </>
   );
};

export default VideoPreviewForPositioning;
