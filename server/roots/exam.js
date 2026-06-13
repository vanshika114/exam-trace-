const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");
const Session = require("../models/Session");

const ANALYZER_URL = process.env.ANALYZER_URL || "http://localhost:8000";

// --- Merkle Tree (mirrors client logic) ---
function hashLeaf(event) {
  const str = `${event.key}:${event.type}:${event.timestamp}`;
  return crypto.createHash("sha256").update(str).digest("hex");
}

function buildMerkleRoot(events) {
  if (!events || events.length === 0) return null;
  let layer = events.map(hashLeaf);
  while (layer.length > 1) {
    if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1]); // duplicate last
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(crypto.createHash("sha256").update(layer[i] + layer[i + 1]).digest("hex"));
    }
    layer = next;
  }
  return layer[0];
}

// POST /api/exam/submit
router.post("/submit", async (req, res) => {
  const { sessionId, candidateName, examId, keystrokes, merkleRoot, tabExits, pasteCount, code } = req.body;

  if (!sessionId || !keystrokes || !merkleRoot) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 1. Recompute Merkle root server-side
  const serverMerkleRoot = buildMerkleRoot(keystrokes);
  const merkleValid = serverMerkleRoot === merkleRoot;

  if (!merkleValid) {
    // Integrity violation — still save, but flag immediately
    console.warn(`[INTEGRITY] Merkle mismatch for session ${sessionId}`);
  }

  // 2. Call Python analyzer
  let analyzerResult = null;
  try {
    const analyzerRes = await axios.post(`${ANALYZER_URL}/analyze`, {
      keystrokes,
      code: code || "",
    });
    analyzerResult = analyzerRes.data;
  } catch (err) {
    console.error("[ANALYZER] Failed to reach analyzer service:", err.message);
  }

  // 3. Determine final verdict
  let finalVerdict = "PENDING";
  if (!merkleValid) {
    finalVerdict = "FLAGGED";
  } else if (analyzerResult) {
    finalVerdict = analyzerResult.verdict;
  }

  // 4. Upsert session in MongoDB
  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        candidateName: candidateName || "Unknown",
        examId: examId || "default",
        keystrokes,
        merkleRoot,
        serverMerkleRoot,
        merkleValid,
        tabExits: tabExits || 0,
        pasteCount: pasteCount || 0,
        analyzerResult,
        finalVerdict,
        endTime: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, merkleValid, finalVerdict, sessionId: session.sessionId });
  } catch (err) {
    console.error("[DB] Save failed:", err.message);
    return res.status(500).json({ error: "Database error" });
  }
});

// GET /api/exam/sessions — for judge dashboard
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await Session.find({}).sort({ createdAt: -1 }).limit(50);
    return res.json(sessions);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// GET /api/exam/session/:id
router.get("/session/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ error: "Not found" });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: "Fetch failed" });
  }
});

module.exports = router;