import React, { useRef, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';

const CodeEditor = ({ 
  value = '', 
  onChange, 
  language = 'javascript',
  placeholder = 'Write your code here...',
  minHeight = '300px',
  readOnly = false 
}) => {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const containerRef = useRef(null);

  // Sync scroll between textarea and pre
  const handleScroll = (e) => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Handle textarea input
  const handleInput = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Handle tab key
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      if (onChange) {
        onChange(newValue);
      }
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Update syntax highlighting
  useEffect(() => {
    if (preRef.current) {
      const code = preRef.current.querySelector('code');
      if (code) {
        code.textContent = value || '';
        Prism.highlightElement(code);
      }
    }
  }, [value, language]);

  return (
    <div 
      ref={containerRef}
      className="code-editor-container"
      style={{
        position: 'relative',
        minHeight: minHeight,
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f5f5f5',
        overflow: 'hidden'
      }}
    >
      {/* Syntax highlighted preview */}
      <pre
        ref={preRef}
        className="code-editor-preview"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: '10px',
          fontFamily: '"Fira code", "Fira Mono", "Consolas", "Monaco", monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          overflow: 'auto',
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          color: 'transparent',
          caretColor: 'black'
        }}
      >
        <code className={`language-${language}`}>{value || ''}</code>
      </pre>

      {/* Actual textarea for input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck="false"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className="code-editor-textarea"
        style={{
          position: 'relative',
          margin: 0,
          padding: '10px',
          width: '100%',
          height: '100%',
          minHeight: minHeight,
          fontFamily: '"Fira code", "Fira Mono", "Consolas", "Monaco", monospace',
          fontSize: '14px',
          lineHeight: '1.6',
          border: 'none',
          outline: 'none',
          resize: 'vertical',
          backgroundColor: 'transparent',
          color: '#000',
          caretColor: '#000',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'auto',
          WebkitTextFillColor: 'transparent',
          textFillColor: 'transparent'
        }}
      />
    </div>
  );
};

export default CodeEditor;
