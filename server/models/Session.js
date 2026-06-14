const mongoose = require("mongoose");

const KeystrokeEventSchema = new mongoose.Schema({
  key: String,
  type: { type: String, enum: ["keydown", "keyup"] },
  timestamp: Number,
}, { _id: false });

// Each face violation event logged by the client
const FaceViolationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["NO_FACE", "MULTI_FACE", "LOOK_AWAY"],
  },
  timestamp: Number,
}, { _id: false });

// ── NEW: Paste event with anomaly analysis ──
const PasteEventSchema = new mongoose.Schema({
  timestamp: Number,
  pastedLength: Number,           // Size of pasted content
  pastedContent: String,          // The actual pasted text (first 1000 chars)
  anomalyScore: Number,           // 0-1 score of suspicion
  anomalyFlags: [String],         // ["LARGE_PASTE", "CODE_BLOCK", etc.]
  isSuspicious: Boolean,          // true if anomalyScore > 0.45
  typingSpeedBefore: Number,      // chars/sec before paste
  typingSpeedAfter: Number,       // chars/sec after paste
  typingSpeedDelta: Number,       // % change
  keystrokesAroundPaste: Number,  // keystrokes within 2s of paste
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  candidateName: { type: String, required: true },
  examId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,

  keystrokes: [KeystrokeEventSchema],

  merkleRoot: String,
  serverMerkleRoot: String,
  merkleValid: Boolean,

  tabExits: { type: Number, default: 0 },
  
  // ── ENHANCED: Paste tracking with anomaly detection ──
  pasteEvents: [PasteEventSchema],           // Full paste history
  pasteCount: { type: Number, default: 0 },  // Total paste count
  suspiciousPasteCount: { type: Number, default: 0 }, // Flagged pastes
  pasteSuspicionScore: Number,               // 0-1 overall paste score
  // ─────────────────────────────────────────────────────

  // ── Face proctoring ──────────────────────────────────────
  faceViolations: [FaceViolationSchema],
  faceViolationCount: { type: Number, default: 0 },
  faceNoFaceCount: { type: Number, default: 0 },
  faceMultiFaceCount: { type: Number, default: 0 },
  faceLookAwayCount: { type: Number, default: 0 },
  // ─────────────────────────────────────────────────────────

  // ── Typing behavior anomalies ────────────────────────────
  typingAnomalies: [{
    timestamp: Number,
    anomalyType: String,           // "SUDDEN_SPEED_CHANGE", "INCONSISTENT_PATTERN"
    severity: String,              // "LOW", "MEDIUM", "HIGH"
    description: String,
  }],
  // ─────────────────────────────────────────────────────────

  analyzerResult: {
    anomalyScore: Number,
    holdTimeMean: Number,
    holdTimeStd: Number,
    ikgMean: Number,
    ikgStd: Number,
    astSimilarity: Number,
    pasteAnomalyScore: Number,     // NEW: paste-specific score
    verdict: { type: String, enum: ["CLEAN", "SUSPICIOUS", "FLAGGED"] },
  },

  finalVerdict: {
    type: String,
    enum: ["CLEAN", "SUSPICIOUS", "FLAGGED", "PENDING"],
    default: "PENDING",
  },
}, { timestamps: true });

module.exports = mongoose.model("Session", SessionSchema);