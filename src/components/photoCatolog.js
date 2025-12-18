import React, { useState, useEffect } from 'react';
import '../analsticsOnResult.css';

const PhotoCatalog = ({ searchTerm }) => {
   const [Photos, setPhotos] = useState([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");

   useEffect(() => {
      const fetchPhotos = async () => {
         if (!searchTerm) {
            return;
         }

         setLoading(true);
         setError("");
         try {
            const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getPhotosUsingTestID", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({ searchTerm: searchTerm }),
            });

            if (!response.ok) {
               throw new Error("Failed to fetch photos");
            }

            const data = await response.json();

            if (data.statusCode === 200) {
               setPhotos(JSON.parse(data.body) || []); 
            } else {
               setError(data.message || "No photos found");
            }
         } catch (err) {
            setError(err.message || "An error occurred while fetching photos");
         } finally {
            setLoading(false);
         }
      };

      fetchPhotos();
   }, [searchTerm]);

   const getGridClass = () => {
      if (!Photos || Photos.length === 0) return '';
      if (Photos.length === 1) return 'photo-grid-1';
      if (Photos.length === 2) return 'photo-grid-2';
      return 'photo-grid-3';
   };

   return (
      <>
      <div className={`photo-catalog-container ${getGridClass()}`}>
         {loading ? (
            <p>Loading photos...</p>
         ) : error ? (
            <p className="photo-catalog-error">{error}</p>
         ) : Photos && Photos.length > 0 ? (
            Photos.map((photo, index) => (
               <div key={index} className="photo-card">
                  <img src={photo.url} alt={`Photo ${index + 1}`} className="photo-card-image" />
               </div>
            ))
         ) : (
            <p className="photo-catalog-no-photos">No photos available</p>
         )}
      </div>
      </>
   );
};

const styles = {
   container: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      justifyContent: 'center',
      padding: '16px',
   },
   photoCard: {
      border: '1px solid #ccc',
      borderRadius: '8px',
      overflow: 'hidden',
      width: '200px',
      textAlign: 'center',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      lineHeight: 0.6,
   },
   image: {
      width: '100%',
      height: 'auto',
   },
   noPhotos: {
      fontSize: '18px',
      color: '#888',
   },
   error: {
      fontSize: '18px',
      color: 'red',
   },
};


export default PhotoCatalog;