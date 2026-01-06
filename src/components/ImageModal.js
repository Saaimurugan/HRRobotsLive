import { useEffect, useCallback } from 'react';
import '../imageModal.css';

const ImageModal = ({ isOpen, imageUrl, imageAlt, onClose }) => {
   // Handle escape key to close modal
   const handleKeyDown = useCallback((e) => {
      if (e.key === 'Escape') {
         onClose();
      }
   }, [onClose]);

   useEffect(() => {
      if (isOpen) {
         document.addEventListener('keydown', handleKeyDown);
         document.body.style.overflow = 'hidden';
      }
      return () => {
         document.removeEventListener('keydown', handleKeyDown);
         document.body.style.overflow = 'unset';
      };
   }, [isOpen, handleKeyDown]);

   if (!isOpen) return null;

   return (
      <div className="image-modal-overlay" onClick={onClose}>
         <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={onClose} aria-label="Close modal">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
               </svg>
            </button>
            <img 
               src={imageUrl} 
               alt={imageAlt || 'Full size image'} 
               className="image-modal-image"
            />
         </div>
      </div>
   );
};

export default ImageModal;
