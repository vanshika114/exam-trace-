import React, { useEffect, useState, useRef } from 'react';
import './MobileMonitor.css';

export default function MobileMonitor({ sessionId, studentName, examCode }) {
  const [alerts, setAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [status, setStatus] = useState('Connected');
  const [lastAlert, setLastAlert] = useState(null);
  const alertCountRef = useRef(0);
  const motionThresholdRef = useRef(0);

  // Detect device rotation/orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      
      // If landscape orientation during exam, flag it
      if (orientation === 'landscape') {
        logAlert('ORIENTATION_CHANGE', 'Device rotated to landscape mode');
      }
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  // Detect device motion (shaking, moving)
  useEffect(() => {
    if (!window.DeviceMotionEvent) {
      console.warn('Device Motion API not supported');
      return;
    }

    const handleDeviceMotion = (event) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x, y, z } = accelerationIncludingGravity;
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z);

      // Threshold for detecting sudden movement/shaking
      if (totalAcceleration > 30) {
        if (motionThresholdRef.current === 0) {
          logAlert('DEVICE_MOTION', `Excessive device motion detected (acceleration: ${totalAcceleration.toFixed(1)})`);
          motionThresholdRef.current = Date.now();
        } else if (Date.now() - motionThresholdRef.current > 2000) {
          // Only log again after 2 seconds of high motion
          motionThresholdRef.current = 0;
        }
      }
    };

    const requestPermission = async () => {
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
          const permission = await DeviceMotionEvent.requestPermission();
          if (permission === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion);
          }
        } catch (error) {
          console.warn('Permission denied for device motion:', error);
        }
      } else {
        // Non-iOS or older browsers - just add listener
        window.addEventListener('devicemotion', handleDeviceMotion);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, []);

  // Detect window/tab blur (switching away)
  useEffect(() => {
    const handleBlur = () => {
      logAlert('WINDOW_BLUR', 'Student switched to another tab/app');
      setStatus('Away');
    };

    const handleFocus = () => {
      logAlert('WINDOW_FOCUS', 'Student returned to exam');
      setStatus('Back');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Detect long press / right click
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      logAlert('CONTEXT_MENU', 'Attempted to open context menu');
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Detect clipboard access
  useEffect(() => {
    const handleCopy = () => {
      logAlert('COPY_ATTEMPT', 'Student attempted to copy content');
    };

    const handlePaste = () => {
      logAlert('PASTE_ATTEMPT', 'Student attempted to paste content');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Log alert and send to server
  const logAlert = async (alertType, message) => {
    const timestamp = new Date().toISOString();
    const alertData = {
      sessionId,
      studentName,
      examCode,
      alertType,
      message,
      timestamp,
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Add to local state
    setAlerts(prev => [...prev, alertData]);
    setLastAlert(alertData);
    alertCountRef.current++;

    // Send to backend
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  };

  // Prevent full screen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logAlert('FULLSCREEN_EXIT', 'Student exited fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="mobile-monitor-container">
      <div className="monitor-status-bar">
        <div className="status-info">
          <span className={`status-badge ${status.toLowerCase()}`}>
            {status === 'Connected' && '🟢'}
            {status === 'Away' && '🔴'}
            {status === 'Back' && '🟡'}
            {status}
          </span>
          <div className="student-info">
            <strong>{studentName}</strong>
            <small>Exam: {examCode}</small>
          </div>
        </div>
        <div className="alert-counter">
          <span className="alert-count">{alertCountRef.current} alerts</span>
        </div>
      </div>

      <div className="monitor-content">
        <div className="monitoring-icon">👁️</div>
        <h1>Exam Integrity Monitor</h1>
        <p>Your activity is being monitored for exam integrity</p>

        {lastAlert && (
          <div className="last-alert-card">
            <h3>Latest Alert:</h3>
            <p className="alert-type">{lastAlert.alertType}</p>
            <p className="alert-message">{lastAlert.message}</p>
            <small>{new Date(lastAlert.timestamp).toLocaleTimeString()}</small>
          </div>
        )}

        <div className="monitoring-checklist">
          <h3>Active Monitoring:</h3>
          <ul>
            <li>📱 Device motion & acceleration</li>
            <li>🔄 Window/app switching</li>
            <li>📹 Screen orientation changes</li>
            <li>📋 Copy/paste attempts</li>
            <li>🖱️ Context menu access</li>
            <li>📸 Fullscreen status</li>
          </ul>
        </div>

        {alerts.length > 5 && (
          <div className="warning-message">
            ⚠️ High number of alerts detected. This exam session may be flagged for review.
          </div>
        )}
      </div>

      <div className="monitor-footer">
        <p>Session ID: {sessionId}</p>
        <p>Monitoring active • All events logged</p>
      </div>
    </div>
  );
}