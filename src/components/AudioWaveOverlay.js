import { useEffect, useRef } from 'react';

/**
 * Audio wave visualization overlay component
 * Displays animated audio waves that respond to volume levels
 * Designed to overlay on top of video elements
 */
const AudioWaveOverlay = ({ 
  volume = 0, 
  isTalking = false, 
  speechCount = 0,
  isListening = true,
  width = 100,
  height = 90,
  barCount = 5,
  showCount = true
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const barsRef = useRef([]);

  // Initialize bars with random heights
  useEffect(() => {
    barsRef.current = Array(barCount).fill(0).map(() => Math.random() * 0.3);
  }, [barCount]);

  // Animate the audio wave bars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const normalizedVolume = Math.min(1, volume / 100);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isListening) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const barWidth = Math.max(3, (canvas.width - 10) / (barCount * 2));
      const maxBarHeight = canvas.height * 0.7;
      const startX = 5;
      const baseY = canvas.height - 5;

      // Update bar heights based on volume
      barsRef.current = barsRef.current.map((currentHeight, i) => {
        const targetHeight = isTalking 
          ? normalizedVolume * (0.5 + Math.random() * 0.5) 
          : 0.1 + Math.random() * 0.1;
        
        // Smooth transition
        const speed = isTalking ? 0.3 : 0.1;
        return currentHeight + (targetHeight - currentHeight) * speed;
      });

      // Draw bars
      barsRef.current.forEach((barHeight, i) => {
        const x = startX + i * (barWidth + 2);
        const height = Math.max(3, barHeight * maxBarHeight);
        
        // Gradient color based on talking state
        const gradient = ctx.createLinearGradient(x, baseY, x, baseY - height);
        if (isTalking) {
          gradient.addColorStop(0, 'rgba(255, 152, 0, 0.9)');
          gradient.addColorStop(1, 'rgba(255, 87, 34, 0.9)');
        } else {
          gradient.addColorStop(0, 'rgba(76, 175, 80, 0.6)');
          gradient.addColorStop(1, 'rgba(129, 199, 132, 0.6)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, baseY - height, barWidth, height, 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [volume, isTalking, isListening, barCount]);

  const containerStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '2px',
    boxSizing: 'border-box',
    borderBottomLeftRadius: '4px',
    borderBottomRightRadius: '4px'
  };

  const countBadgeStyle = {
    position: 'absolute',
    top: '-8px',
    right: '2px',
    background: isTalking ? '#ff5722' : '#666',
    color: 'white',
    fontSize: '9px',
    fontWeight: 'bold',
    padding: '1px 4px',
    borderRadius: '8px',
    minWidth: '14px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'background 0.2s ease'
  };

  const statusStyle = {
    position: 'absolute',
    top: '2px',
    left: '2px',
    fontSize: '10px',
    color: 'white',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    gap: '3px'
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: isTalking ? '#ff9800' : (isListening ? '#4CAF50' : '#999'),
    boxShadow: isTalking ? '0 0 4px rgba(255, 152, 0, 0.8)' : 'none',
    animation: isTalking ? 'pulse 0.5s infinite' : 'none'
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.8; }
          }
        `}
      </style>
      <div style={containerStyle}>
        {/* Status indicator */}
        <div style={statusStyle}>
          <div style={dotStyle} />
          <span>{isTalking ? '🗣️' : '🔇'}</span>
        </div>

        {/* Speech count badge */}
        {showCount && speechCount > 0 && (
          <div style={countBadgeStyle} title={`Speech detected ${speechCount} times`}>
            {speechCount}
          </div>
        )}

        {/* Audio wave canvas */}
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={30}
          style={{ 
            width: '100%', 
            height: '30px',
            opacity: isListening ? 1 : 0.3
          }} 
        />
      </div>
    </>
  );
};

export default AudioWaveOverlay;
