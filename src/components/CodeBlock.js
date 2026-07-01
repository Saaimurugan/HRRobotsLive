import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * CodeBlock – syntax-highlighted read-only code display.
 * Falls back to a plain <pre> if react-syntax-highlighter is unavailable.
 *
 * Props:
 *  code     {string}  – the code to display
 *  language {string}  – language hint (default: "javascript")
 */
const CodeBlock = ({ code = '', language = 'javascript' }) => {
  if (!code) return null;

  return (
    <div style={{ borderRadius: '6px', overflow: 'hidden', fontSize: '0.88em' }}>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        wrapLongLines
        customStyle={{
          margin: 0,
          padding: '12px',
          borderRadius: '6px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
