import React, { useState, useEffect } from 'react';

const DEFAULT_TIME = 3600; // 1 hour in seconds (default)

const TimerComponent = ({ onTimerEnd, testDuration, startTimer = true }) => {
   // testDuration is in minutes, convert to seconds. Default to 60 minutes if not provided
   const maxTime = testDuration ? testDuration * 60 : DEFAULT_TIME;
   const [time, setTime] = useState(maxTime);
   const [isBlinking, setIsBlinking] = useState(false);
   const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
   const [timerStarted, setTimerStarted] = useState(false);

   // Handle window resize
   useEffect(() => {
      const handleResize = () => {
         setIsMobile(window.innerWidth <= 768);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
   }, []);

   // Start timer only when startTimer becomes true
   useEffect(() => {
      if (startTimer && !timerStarted) {
         setTimerStarted(true);
         //console.log('🕐 Test timer started - first question loaded');
      }
   }, [startTimer, timerStarted]);

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
      // Only start the countdown if timer has been started
      if (!timerStarted) {
         return;
      }

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
   }, [timerStarted]); // Depend on timerStarted instead of empty array

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

      // Always use compact mobile-style format
      return (
         <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            <span>{String(hours).padStart(2, '0')}</span>
            <span>:</span>
            <span>{String(minutes).padStart(2, '0')}</span>
            <span>:</span>
            <span>{String(secs).padStart(2, '0')}</span>
         </div>
      );
   };

   const getTimerStyle = () => {
      if (!timerStarted) {
         return { color: '#ccc' }; // Show timer as inactive when not started
      }
      if (time < 60) {
         return isBlinking ? { color: 'red', visibility: 'hidden' } : { color: 'red' }; // Blink effect
      } else if (time < 300) {
         return { color: '#ff6b6b' }; // Less than 5 minutes - use mobile red color
      } else if (time < 600) {
         return { color: 'orange' }; // Less than 10 minutes
      } else {
         return { color: 'white' }; // Default white color for overlay
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
            minWidth: '40px',
            // Always use compact mobile-style background and padding
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '4px',
            padding: '2px 6px',
         }}
         title={!timerStarted ? "Timer will start when first question loads" : undefined}
      >
         <div
            style={{
               fontSize: '12px', // Always use compact mobile font size
               fontFamily: 'revert',
               textAlign: 'center',
               marginTop: '0',
               marginBottom: '0px',
               fontWeight: '600', // Always use mobile font weight
               ...getTimerStyle(), // Apply color styling
            }}
         >
            {formatTime(time)}
         </div>
      </div>
   );
};

export default TimerComponent;