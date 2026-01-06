import React, { useState, useEffect } from 'react';

const DEFAULT_TIME = 3600; // 1 hour in seconds (default)

const TimerComponent = ({ onTimerEnd, testDuration }) => {
   // testDuration is in minutes, convert to seconds. Default to 60 minutes if not provided
   const maxTime = testDuration ? testDuration * 60 : DEFAULT_TIME;
   const [time, setTime] = useState(maxTime);
   const [isBlinking, setIsBlinking] = useState(false);
   const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

   // Handle window resize
   useEffect(() => {
      const handleResize = () => {
         setIsMobile(window.innerWidth <= 768);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
   }, []);

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

      return isMobile ? (
         <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            <span>{String(hours).padStart(2, '0')}</span>
            <span>:</span>
            <span>{String(minutes).padStart(2, '0')}</span>
            <span>:</span>
            <span>{String(secs).padStart(2, '0')}</span>
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: isMobile ? '0' : '20px',
            flexShrink: 0,
            minWidth: isMobile ? '40px' : 'auto',
            ...(isMobile && {
               background: 'rgba(0, 0, 0, 0.6)',
               borderRadius: '4px',
               padding: '2px 6px',
            }),
         }}
      >
         <div
            style={{
               fontSize: isMobile ? '12px' : '75px',
               fontFamily: 'revert',
               textAlign: 'center',
               marginTop: isMobile ? '0' : '10px',
               marginBottom: '0px',
               fontWeight: isMobile ? '600' : 'normal',
               color: isMobile ? 'white' : undefined,
               ...(!isMobile && getTimerStyle()),
               ...(isMobile && time < 300 && { color: '#ff6b6b' }),
            }}
         >
            {formatTime(time)}
         </div>
      </div>
   );
};

export default TimerComponent;