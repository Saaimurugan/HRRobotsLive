import { useState, useEffect } from 'react';
import useAudioDetection from './useAudioDetection';

/**
 * Visual indicator component for audio/speech detection
 * Shows when someone is talking and displays volume level
 */
const AudioIndicator = ({ 
  enabled = true,
  threshold = 30,
  onSpeechDetected,
  onSpeechEnded,
  showVolumeBar = true,
  compact = false
}) => {
  const [speechCount, setSpeechCount] = useState(0);

  const { isTalking, volume, isListening, error } = useAudioDetection({
    enabled,
    threshold,
    silenceDelay: 500,
    onSpeechStart: () => {
      setSpeechCount(prev => prev + 1);
      onSpeechDetected?.();
    },
    onSpeechEnd: () => {
      onSpeechEnded?.();
    }
  });

  // Normalize volume for display (0-100)
  const normalizedVolume = Math.min(100, (volume / 128) * 100);

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? '8px' : '12px',
    padding: compact ? '4px 8px' : '8px 12px',
    borderRadius: '8px',
    background: isTalking ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    border: `1px solid ${isTalking ? '#4CAF50' : '#ddd'}`,
    transition: 'all 0.2s ease'
  };

  const indicatorStyle = {
    width: compact ? '12px' : '16px',
    height: compact ? '12px' : '16px',
    borderRadius: '50%',
    background: !isListening ? '#999' : isTalking ? '#4CAF50' : '#ccc',
    boxShadow: isTalking ? '0 0 8px rgba(76, 175, 80, 0.6)' : 'none',
    transition: 'all 0.15s ease',
    animation: isTalking ? 'pulse 1s infinite' : 'none'
  };

  const volumeBarContainerStyle = {
    width: compact ? '60px' : '80px',
    height: compact ? '6px' : '8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden'
  };

  const volumeBarStyle = {
    width: `${normalizedVolume}%`,
    height: '100%',
    background: normalizedVolume > 70 ? '#f44336' : normalizedVolume > 40 ? '#ff9800' : '#4CAF50',
    transition: 'width 0.05s ease, background 0.2s ease',
    borderRadius: '4px'
  };

  const labelStyle = {
    fontSize: compact ? '11px' : '13px',
    color: isTalking ? '#2e7d32' : '#666',
    fontWeight: isTalking ? '600' : '400',
    minWidth: compact ? '50px' : '70px'
  };

  if (error) {
    return (
      <div style={{ ...containerStyle, background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336' }}>
        <span style={{ fontSize: '12px', color: '#f44336' }}>🎤 Mic Error</span>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
        `}
      </style>
      <div style={containerStyle}>
        <div style={indicatorStyle} title={isTalking ? 'Speech detected' : 'Listening...'} />
        <span style={labelStyle}>
          {!isListening ? 'Off' : isTalking ? 'Talking' : 'Silent'}
        </span>
        {showVolumeBar && isListening && (
          <div style={volumeBarContainerStyle}>
            <div style={volumeBarStyle} />
          </div>
        )}
      </div>
    </>
  );
};

export default AudioIndicator;
