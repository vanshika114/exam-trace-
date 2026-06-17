import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Hook for detecting voice activity in real-time using Web Audio API
 * Tracks voice presence and sends alerts when voice is detected during exam
 */
export function useVoiceDetector(enabled = true) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const isListeningRef = useRef(false);
  const voiceDetectedCountRef = useRef(0);

  const [isActive, setIsActive] = useState(false);
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState(null);

  // Callback when voice is detected
  const onVoiceDetected = useCallback((callback) => {
    const originalCallback = callback;
    return (timestamp) => {
      voiceDetectedCountRef.current += 1;
      originalCallback({ timestamp, count: voiceDetectedCountRef.current });
    };
  }, []);

  // Initialize Web Audio API
  const startListening = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // We want raw audio for better detection
        },
      });

      // Create audio context
      const audioContext =
        window.AudioContext || window.webkitAudioContext;
      const context = new audioContext();
      audioContextRef.current = context;

      // Create analyser
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect microphone to analyser
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      micStreamRef.current = stream;
      isListeningRef.current = true;
      setIsActive(true);
      setError(null);

      console.log("🎤 Voice detector started");
    } catch (err) {
      console.error("❌ Microphone access denied:", err);
      setError("Microphone access denied. Please allow microphone access.");
      setIsActive(false);
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsActive(false);
    setVoiceDetected(false);
    console.log("🎤 Voice detector stopped");
  }, []);

  // Detect voice in audio stream
  const detectVoice = useCallback(() => {
    if (!isListeningRef.current || !analyserRef.current) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average frequency (volume indicator)
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setVolume(average);

    // Voice detection threshold (adjust based on environment)
    // Lower values = more sensitive
    const VOICE_THRESHOLD = 30;
    const isVoiceDetected = average > VOICE_THRESHOLD;

    if (isVoiceDetected && !voiceDetected) {
      setVoiceDetected(true);
      console.log("🔊 VOICE DETECTED! Volume:", average.toFixed(2));
    } else if (!isVoiceDetected && voiceDetected) {
      setVoiceDetected(false);
    }

    // Continue detection loop
    requestAnimationFrame(detectVoice);
  }, [voiceDetected]);

  // Start detection loop when enabled
  useEffect(() => {
    if (!enabled) {
      stopListening();
      return;
    }

    startListening().then(() => {
      // Small delay to ensure stream is ready
      setTimeout(() => {
        if (isListeningRef.current) {
          detectVoice();
        }
      }, 500);
    });

    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening, detectVoice]);

  return {
    isActive,
    voiceDetected,
    volume,
    error,
    voiceDetectedCount: voiceDetectedCountRef.current,
    startListening,
    stopListening,
    resetCount: () => {
      voiceDetectedCountRef.current = 0;
    },
  };
}