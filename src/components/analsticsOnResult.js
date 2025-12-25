import { useState, useImperativeHandle, forwardRef, useEffect, useCallback } from "react";
import { useGlobalContext } from "../globalContext";
import "../analsticsOnResult.css";

const AnalsticsOnResult = forwardRef(({ searchTerm, hideGenerateButton = false }, ref) => {
   const { globalValue, JWTValue } = useGlobalContext();
   const [analyticsData, setAnalyticsData] = useState("");
   const [loading, setLoading] = useState(false);

   const fetchAnalytics = useCallback(async () => {
      if (!searchTerm) {
         //console.error("Search term is required to fetch analytics");
         return;
      }

      setLoading(true);
      try {
         const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getAnalytics", {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ globalValue, searchTerm, token: JWTValue }),
         });

         if (response.ok) {
            const data = await response.json();
            const htmlContent = data.body.match(/<!DOCTYPE html>.*?<\/html>/gs)[0];
            //console.log(htmlContent);
            setAnalyticsData(htmlContent);
         } else {
            //console.error("Failed to fetch analytics");
         }
      } catch (error) {
         //console.error("Error fetching analytics:", error);
      } finally {
         setLoading(false);
      }
   }, [searchTerm, globalValue]);

   // Expose fetchAnalytics function to parent component
   useImperativeHandle(ref, () => ({
      fetchAnalytics
   }));

   // Auto-fetch when component mounts and hideGenerateButton is true
   useEffect(() => {
      if (hideGenerateButton && searchTerm) {
         fetchAnalytics();
      }
   }, [hideGenerateButton, searchTerm, fetchAnalytics]);

   const handlePrint = () => {
      const analyticsContent = document.querySelector(".analytics-content");
      if (!analyticsContent) return;
      
      const printWindow = window.open("", "_blank");
      
      // Get the iframe content styles if available
      const iframe = analyticsContent.querySelector("iframe");
      let iframeStyles = "";
      let iframeBody = "";
      
      if (iframe && iframe.contentDocument) {
         const iframeDoc = iframe.contentDocument;
         const styleElements = iframeDoc.querySelectorAll("style");
         styleElements.forEach(style => {
            iframeStyles += style.outerHTML;
         });
         iframeBody = iframeDoc.body ? iframeDoc.body.innerHTML : "";
      }
      
      // Use the analytics HTML content directly
      const contentToPrint = iframeBody || analyticsContent.innerHTML;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Performance Report</title>
            ${iframeStyles}
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                padding: 0;
                background: #fff;
              }
              button {
                display: none !important;
              }
              .no-print {
                display: none !important;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 12px;
              }
              @media print {
                body { margin: 0; padding: 10px; }
                button { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${contentToPrint}
            <div class="footer">
              <p>Powered by HR Robots | www.hrrobots.com</p>
            </div>
          </body>
        </html>
      `);
      
      // Wait for all images to load before printing
      const images = printWindow.document.images;
      const totalImages = images.length;
      let loadedImages = 0;
    
      if (totalImages === 0) {
         printWindow.document.close();
         printWindow.print();
      } else {
         for (let img of images) {
            img.onload = () => {
               loadedImages++;
               if (loadedImages === totalImages) {
                  printWindow.document.close();
                  printWindow.print();
               }
            };
            img.onerror = () => {
               loadedImages++;
               if (loadedImages === totalImages) {
                  printWindow.document.close();
                  printWindow.print();
               }
            };
         }
      }
   };

   return (
      <div className="analytics-container">
         {!hideGenerateButton && (
            <button className="no-print" onClick={fetchAnalytics} disabled={loading}>
               {loading ? "Loading..." : "Generate Analytics"}
            </button>
         )}
         {loading && (
            <div className="analytics-loading">
               <p>Generating analytics...</p>
            </div>
         )}
         <div id="printableContentAnalytics" className={analyticsData ? "printable-content" : "printable-content--hidden"}>
            <div
               className="analytics-content"
               dangerouslySetInnerHTML={{ __html: analyticsData }}
            />
         </div>
         {analyticsData && (
            <button className="analytics-print-btn no-print" onClick={handlePrint}>
               Print Report
            </button>
         )}
      </div>
   );
});

AnalsticsOnResult.displayName = 'AnalsticsOnResult';

export default AnalsticsOnResult;