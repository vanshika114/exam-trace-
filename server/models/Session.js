const mongoose = require("mongoose");

const KeystrokeEventSchema = new mongoose.Schema({
  key: String,
  type: { type: String, enum: ["keydown", "keyup"] },
  timestamp: Number,
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  candidateName: { type: String, required: true },
  examId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,

  keystrokes: [KeystrokeEventSchema],

  merkleRoot: String,          // Root submitted by client
  serverMerkleRoot: String,    // Root recomputed server-side (must match)
  merkleValid: Boolean,

  tabExits: { type: Number, default: 0 },
  pasteCount: { type: Number, default: 0 },

  analyzerResult: {
    anomalyScore: Number,
    holdTimeMean: Number,
    holdTimeStd: Number,
    ikgMean: Number,       // inter-key gap mean
    ikgStd: Number,
    astSimilarity: Number,
    verdict: { type: String, enum: ["CLEAN", "SUSPICIOUS", "FLAGGED"] },
  },

  finalVerdict: { type: String, enum: ["CLEAN", "SUSPICIOUS", "FLAGGED", "PENDING"], default: "PENDING" },
}, { timestamps: true });

module.exports = mongoose.model("Session", SessionSchema);