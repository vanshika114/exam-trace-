import React, { useEffect, useRef } from "react";
import { useVoiceDetector } from "../hooks/useVoiceDetector";

/**
 * VoiceMonitor Component
 * Displays real-time voice detection status with visual feedback
 * Similar to FaceMonitor but for voice activity
 */
function VoiceMonitor({ onViolation, enabled = true }) {
  const {
    isActive,
    voiceDetected,
    volume,
    error,
    voiceDetectedCount,
  } = useVoiceDetector(enabled);

  const voiceViolationsRef = useRef([]);

  // Trigger callback when voice is detected
  useEffect(() => {
    if (voiceDetected) {
      const timestamp = Date.now();
      const violation = {
        type: "VOICE_DETECTED",
        timestamp,
        volume: volume.toFixed(2),
      };

      voiceViolationsRef.current.push(violation);
      onViolation("VOICE_DETECTED", timestamp);

      console.log("🚨 Voice violation logged:", violation);
    }
  }, [voiceDetected, volume, onViolation]);

  // Volume bar visualization (0-100)
  const volumePercent = Math.min((volume / 255) * 100, 100);

  // Status indicator color
  const getStatusColor = () => {
    if (error) return "#ef4444"; // Red - Error
    if (!isActive) return "#64748b"; // Gray - Inactive
    if (voiceDetected) return "#ef4444"; // Red - Voice detected
    return "#22c55e"; // Green - Clear
  };

  const getStatusText = () => {
    if (error) return "❌ Error";
    if (!isActive) return "⏸ Inactive";
    if (voiceDetected) return "🔊 Voice Detected!";
    return "✓ Clear";
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.statusDot} style={{ backgroundColor: getStatusColor() }}></div>
        <span style={styles.statusText}>{getStatusText()}</span>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {!error && (
        <>
          {/* Volume Meter */}
          <div style={styles.meterContainer}>
            <div style={styles.meterLabel}>Volume</div>
            <div style={styles.meterBar}>
              <div
                style={{
                  ...styles.meterFill,
                  width: `${volumePercent}%`,
                  backgroundColor: volumePercent > 40 ? "#ef4444" : "#38bdf8",
                }}
              ></div>
            </div>
            <div style={styles.meterValue}>
              {volume.toFixed(0)} dB
            </div>
          </div>

          {/* Detection Counter */}
          <div style={styles.counter}>
            <span style={styles.counterLabel}>Voice Detections:</span>
            <span
              style={{
                ...styles.counterValue,
                color: voiceDetectedCount > 0 ? "#ef4444" : "#22c55e",
              }}
            >
              {voiceDetectedCount}
            </span>
          </div>

          {/* Status Info */}
          <div style={styles.info}>
            <p style={styles.infoText}>
              {isActive
                ? "Microphone listening for voice activity..."
                : "Waiting for microphone access..."}
            </p>
          </div>

          {/* Recent Violations */}
          {voiceViolationsRef.current.length > 0 && (
            <div style={styles.violationLog}>
              <p style={styles.violationTitle}>Recent Voice Alerts</p>
              {voiceViolationsRef.current.slice(-3).reverse().map((v, i) => (
                <div key={i} style={styles.violationRow}>
                  <span style={styles.violationType}>🔊 Voice</span>
                  <span style={styles.violationTime}>
                    {new Date(v.timestamp).toLocaleTimeString()}
                  </span>
                  <span style={styles.volumeDisplay}>
                    {v.volume} dB
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: "#1e293b",
    borderRadius: 8,
    padding: 12,
    border: "1px solid #334155",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  statusText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  errorBox: {
    background: "#ef444422",
    border: "1px solid #ef4444",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#fca5a5",
    margin: 0,
  },
  meterContainer: {
    marginBottom: 12,
  },
  meterLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  meterBar: {
    background: "#0f172a",
    borderRadius: 4,
    height: 20,
    overflow: "hidden",
    marginBottom: 4,
    border: "1px solid #334155",
  },
  meterFill: {
    height: "100%",
    transition: "width 0.1s ease",
  },
  meterValue: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "right",
  },
  counter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    background: "#0f172a",
    borderRadius: 4,
    marginBottom: 12,
  },
  counterLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },
  counterValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  info: {
    background: "#0f172a",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 11,
    color: "#64748b",
    margin: 0,
  },
  violationLog: {
    background: "#0f172a",
    borderRadius: 4,
    padding: 8,
    marginTop: 12,
    borderTop: "1px solid #334155",
  },
  violationTitle: {
    fontSize: 10,
    color: "#475569",
    textTransform: "uppercase",
    margin: "0 0 6px",
  },
  violationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 10,
    padding: 4,
    marginBottom: 4,
    borderBottom: "1px solid #334155",
  },
  violationType: {
    fontWeight: 600,
    color: "#ef4444",
    flex: 1,
  },
  violationTime: {
    color: "#64748b",
    flex: 1,
    textAlign: "center",
  },
  volumeDisplay: {
    color: "#38bdf8",
    fontWeight: 600,
    flex: 1,
    textAlign: "right",
  },
};

export default VoiceMonitor;