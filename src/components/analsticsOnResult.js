import React, { useState } from "react";
import { GlobalProvider, useGlobalContext } from "../globalContext";
import "../analsticsOnResult.css";

const AnalsticsOnResult = ({ searchTerm }) => {
   const { globalValue } = useGlobalContext();
   const [analyticsData, setAnalyticsData] = useState("");
   const [loading, setLoading] = useState(false);

   const fetchAnalytics = async () => {
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
            body: JSON.stringify({ globalValue, searchTerm }),
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
   };

   const handlePrint = () => {
      const printableContentAnalytics = document.getElementById("printableContentAnalytics");
      const printWindow = window.open("", "_blank");
      const styles = `
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          #printableContentAnalytics {
            text-align: left;
            background-color: #fff;
            padding: 10px;
            border: 1px solid #ebccd1;
            border-radius: 5px;
            margin: 20px auto;
            max-width: 900px;
          }
          h1, p {
            color: #007bff;
          }
        </style>
      `;
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Results</title>
            ${styles}
          </head>
          <body>${printableContentAnalytics.innerHTML}<p style="text-align: center">Powered by HR Robots | www.hrrobots.com</p></body>
        </html>
      `);
    // Wait for all images to load before printing
    const images = printWindow.document.images;
    const totalImages = images.length;
    let loadedImages = 0;
  
    if (totalImages === 0) {
      // If there are no images, print immediately
      printWindow.document.close();
      printWindow.print();
    } else {
      // Add load event listener to each image
      for (let img of images) {
        img.onload = () => {
          loadedImages++;
          if (loadedImages === totalImages) {
            // All images are loaded, print the document
            printWindow.document.close();
            printWindow.print();
          }
        };
        img.onerror = () => {
          // Handle image load errors (optional)
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
         <button className="no-print" onClick={fetchAnalytics} disabled={loading}>
            {loading ? "Loading..." : "Generate Analytics"}
         </button>
         <div id="printableContentAnalytics" style={{ display: analyticsData ? "block" : "none"}}>
         <div
            className="analytics-content"
            dangerouslySetInnerHTML={{ __html: analyticsData }}
            style={{ alignItems: "left", justifyContent: "left", textAlignLast: "left"}}
         />
         <button onClick={handlePrint}>
              Print
            </button>
         </div>
      </div>
   );
};

export default AnalsticsOnResult;