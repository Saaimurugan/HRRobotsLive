import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for detecting speech/talking from microphone input
 * Uses Web Audio API to analyze audio levels and detect voice activity
 * 
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled - Whether detection is active
 * @param {number} options.threshold - Volume threshold to consider as "talking" (0-255, default: 30)
 * @param {number} options.silenceDelay - Ms of silence before considering speech ended (default: 500)
 * @param {Function} options.onSpeechStart - Callback when speech starts
 * @param {Function} options.onSpeechEnd - Callback when speech ends
 * @param {Function} options.onVolumeChange - Callback with current volume level
 */
const useAudioDetection = ({
  enabled = true,
  threshold = 100,
  silenceDelay = 500,
  onSpeechStart,
  onSpeechEnd,
  onVolumeChange
} = {}) => {
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const isTalkingRef = useRef(false);

  const startListening = useCallback(async () => {
    if (!enabled) return;

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create audio context and analyser
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsListening(true);
      setError(null);

      // Start analyzing audio
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const analyze = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setVolume(average);
        onVolumeChange?.(average);

        // Check if volume exceeds threshold (someone is talking)
        if (average > threshold) {
          // Clear any pending silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }

          // If not already talking, trigger speech start
          if (!isTalkingRef.current) {
            isTalkingRef.current = true;
            setIsTalking(true);
            onSpeechStart?.();
          }
        } else {
          // Volume below threshold
          if (isTalkingRef.current && !silenceTimeoutRef.current) {
            // Start silence timer
            silenceTimeoutRef.current = setTimeout(() => {
              isTalkingRef.current = false;
              setIsTalking(false);
              onSpeechEnd?.();
              silenceTimeoutRef.current = null;
            }, silenceDelay);
          }
        }

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      analyze();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(err.message || 'Failed to access microphone');
      setIsListening(false);
    }
  }, [enabled, threshold, silenceDelay, onSpeechStart, onSpeechEnd, onVolumeChange]);

  const stopListening = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    setIsListening(false);
    setIsTalking(false);
    setVolume(0);
    isTalkingRef.current = false;
  }, []);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }

    return () => stopListening();
  }, [enabled, startListening, stopListening]);

  return {
    isTalking,
    volume,
    isListening,
    error,
    startListening,
    stopListening
  };
};

export default useAudioDetection;
