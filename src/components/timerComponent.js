import React, { useState, useEffect } from 'react';

const MAX_TIME = 3600; // 1 hour in seconds

const TimerComponent = ({ onTimerEnd }) => {
   const [time, setTime] = useState(MAX_TIME);
   const [isBlinking, setIsBlinking] = useState(false);

   useEffect(() => {
      if (time <= 0) {
         if (onTimerEnd) {
            //console.log("Timer has ended! timerComponent component will be closed.");
            onTimerEnd(); // Notify the parent component
         }
         return;
      }
   }, [time, onTimerEnd]);

   useEffect(() => {
      const timer = setInterval(() => {
         setTime((prevTime) => {
            if (prevTime <= 0) {
               clearInterval(timer);
               return 0;
            }
            return prevTime - 1;
         });
      }, 1000);

      return () => clearInterval(timer); // Cleanup on unmount
   }, []); // Empty dependency array ensures this runs only once

   useEffect(() => {
      if (time < 60) {
         const blinkInterval = setInterval(() => {
            setIsBlinking((prev) => !prev);
         }, 500); // Blink every 500ms
         return () => clearInterval(blinkInterval); // Cleanup on unmount
      } else {
         setIsBlinking(false); // Stop blinking if time is >= 60 seconds
      }
   }, [time]);

   const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      const isMobile = window.innerWidth <= 768;

      return isMobile ? (
         <div style={{ display: 'flex', flexDirection: 'column', flexalignItems: 'center', marginLeft: '10px' }}>
            <span style={{ borderBottom: '1px solid black', paddingBottom: '1px' }}>{String(hours).padStart(2, '0')}</span>
            <span style={{ borderBottom: '1px solid black', paddingBottom: '1px' }}>{String(minutes).padStart(2, '0')}</span>
            <span style={{ paddingBottom: '1px' }}>{String(secs).padStart(2, '0')}</span>
         </div>
      ) : (
         <div>
            <span>{String(hours).padStart(2, '0')}</span>
            <span>:</span>
            <span>{String(minutes).padStart(2, '0')}</span>
            <span>:</span>
            <span>{String(secs).padStart(2, '0')}</span>
         </div>
      );
   };

   const getTimerStyle = () => {
      if (time < 60) {
         return isBlinking ? { color: 'red', visibility: 'hidden' } : { color: 'red' }; // Blink effect
      } else if (time < 300) {
         return { color: 'red' }; // Less than 5 minutes
      } else if (time < 600) {
         return { color: 'orange' }; // Less than 10 minutes
      } else {
         return { color: 'black' }; // Default color
      }
   };

   return (
      <div
         style={{
            display: window.innerWidth <= 768 ? 'flex' : 'block', // Flex for mobile, block for larger screens
            flexDirection: window.innerWidth <= 768 ? 'column' : 'initial', // Arrange vertically for mobile
            lineHeight: window.innerWidth <= 768 ? '1.25' : '0', // Adjust line height for mobile
            marginLeft: window.innerWidth <= 768 ? '10px' : '20px',  // Adjust margin for mobile

         }}
      >
         <div
            style={{
               fontSize: window.innerWidth <= 768 ? '20px' : '75px', // Adjust font size for mobile devices
               fontFamily: 'revert', // Calculator-like font
               textAlign: 'center', // Center the text
               marginTop: '10px', // Remove default margin
               marginBottom: '0px', // Remove default margin
               ...getTimerStyle(), // Apply dynamic styles
            }}
         >
            {formatTime(time)}
         </div>
      </div>
   );
};

export default TimerComponent;