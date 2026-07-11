import React, { useRef, useEffect, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';

// Shared style values — must be identical across textarea, pre, and mirror div
const FONT_FAMILY = '"Fira Code", "Fira Mono", Consolas, Monaco, monospace';
const FONT_SIZE   = '14px';
const LINE_HEIGHT = '1.6';
const PADDING     = '10px 12px';

const CodeEditor = ({
  value = '',
  onChange,
  language = 'javascript',
  placeholder = 'Write your code here...',
  minHeight = '300px',
  readOnly = false,
}) => {
  const textareaRef = useRef(null);
  const preRef      = useRef(null);
  const mirrorRef   = useRef(null);

  // Normalize escaped newlines/tabs from backend (e.g., literal \n → actual newline)
  const normalizedValue = useMemo(() => {
    return value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }, [value]);

  // Sync scroll: textarea → pre
  const handleScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop  = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleInput = (e) => {
    if (onChange) onChange(e.target.value);
  };

  // Insert two spaces on Tab instead of losing focus
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: start, selectionEnd: end } = e.target;
      const next = normalizedValue.substring(0, start) + '  ' + normalizedValue.substring(end);
      if (onChange) onChange(next);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Re-highlight whenever value or language changes
  useEffect(() => {
    if (preRef.current) {
      const codeEl = preRef.current.querySelector('code');
      if (codeEl) {
        codeEl.textContent = normalizedValue || '';
        Prism.highlightElement(codeEl);
      }
    }
  }, [normalizedValue, language]);

  // Shared text styles (applied to textarea, pre, and mirror)
  const textStyle = {
    fontFamily:  FONT_FAMILY,
    fontSize:    FONT_SIZE,
    lineHeight:  LINE_HEIGHT,
    padding:     PADDING,
    margin:      0,
    whiteSpace:  'pre-wrap',
    wordWrap:    'break-word',
    tabSize:     2,
  };

  return (
    <div
      style={{
        position:        'relative',
        minHeight:       minHeight,
        border:          '1px solid #ddd',
        borderRadius:    '4px',
        backgroundColor: '#2d2d2d',   // dark background matches prism dark theme
        overflow:        'hidden',
      }}
    >
      {/*
        Invisible mirror div — its height drives the container's height so that
        both the absolute <pre> and absolute <textarea> always match in size.
        It must share every style property that affects line-wrapping.
      */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        style={{
          ...textStyle,
          visibility:    'hidden',
          minHeight:     minHeight,
          // extra trailing newline keeps the last empty line from collapsing
          whiteSpace:    'pre-wrap',
          wordBreak:     'break-word',
        }}
      >
        {/* The extra space ensures the mirror is at least one line tall */}
        {(normalizedValue || ' ') + '\n'}
      </div>

      {/* Syntax-highlighted layer — sits on top of (behind) the textarea */}
      <pre
        ref={preRef}
        aria-hidden="true"
        style={{
          ...textStyle,
          position:      'absolute',
          top:           0,
          left:          0,
          right:         0,
          bottom:        0,
          overflow:      'auto',
          pointerEvents: 'none',
          color:         '#ccc',
          background:    'transparent',
          borderRadius:  0,
          textShadow:    'none',
        }}
      >
        <code className={`language-${language}`} style={{ textShadow: 'none', background: 'transparent' }}>{normalizedValue || ''}</code>
      </pre>

      {/* Actual editable textarea — transparent text, visible cursor */}
      <textarea
        ref={textareaRef}
        value={normalizedValue}
        onChange={handleInput}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          ...textStyle,
          position:              'absolute',
          top:                   0,
          left:                  0,
          right:                 0,
          bottom:                0,
          width:                 '100%',
          height:                '100%',
          border:                'none',
          outline:               'none',
          resize:                'none',
          background:            'transparent',
          // Make text invisible but keep cursor visible
          color:                 'transparent',
          caretColor:            '#fff',
          WebkitTextFillColor:   'transparent',
          overflow:              'auto',
          boxSizing:             'border-box',
        }}
      />
    </div>
  );
};

export default CodeEditor;
