import React, { useEffect, useState } from "react";

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
        <div style={{ color: "red", backgroundColor: "white", padding: "20px", borderRadius: "8px", marginTop: "20px" }} className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mt-4">
          <p className="font-semibold">We recommend using a laptop or PC</p>
          <p>For a stable camera and better UI/UX experience, please access this site on a desktop device.</p>
        </div>
      )}
    </div>
  );
};

export default DeviceWarning;
