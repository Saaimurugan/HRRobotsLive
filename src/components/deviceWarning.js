import React, { useEffect, useState } from "react";
import DisplayMessage from "./displayMessage.js";

const DeviceWarning = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    setIsMobile(isMobileDevice);
  }, []);

  return (
    <div>
      {isMobile && (
        <DisplayMessage 
          message="We recommend using a laptop or PC. For a stable camera and better UI/UX experience, please access this site on a desktop device."
          type="warning"
          isSystemCheck={true}
        />
      )}
    </div>
  );
};

export default DeviceWarning;
