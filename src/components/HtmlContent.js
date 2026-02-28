import React from 'react';
import '../RichTextEditor.css';

/**
 * Component to safely render HTML content from CKEditor
 * Applies proper styling and sanitization
 */
const HtmlContent = ({ content, className = '', style = {} }) => {
  if (!content) return null;
  
  return (
    <div 
      className={`rendered-html-content ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default HtmlContent;
