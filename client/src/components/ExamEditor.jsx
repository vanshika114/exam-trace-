import { useState, useRef, useCallback, useEffect } from "react";
import { useKeystroke } from "../hooks/useKeystroke";
import IntegrityChart from "./IntegrityChart";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ExamEditor({ candidateName = "Candidate", examId = "exam_001" }) {
  const [code, setCode] = useState("# Write your solution here\n");
  const [keystrokes, setKeystrokes] = useState([]);  // mirrored for chart
  const [tabWarnings, setTabWarnings] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const sessionId = useRef(generateSessionId());
  const keystrokeBuffer = useRef([]);

  const onTabExit = useCallback(({ count }) => {
    setTabWarnings(count);
  }, []);

  const { record, handlePaste, getSubmitPayload } = useKeystroke({ onTabExit });

  // Sync ref → state every 2s for IntegrityChart (avoids re-render on every keystroke)
  useEffect(() => {
    const interval = setInterval(() => {
      setKeystrokes([...keystrokeBuffer.current]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e) => {
    const event = { key: e.key, type: "keydown", timestamp: Date.now() };
    keystrokeBuffer.current.push(event);
    record(e.key, "keydown");
  };

  const handleKeyUp = (e) => {
    const event = { key: e.key, type: "keyup", timestamp: Date.now() };
    keystrokeBuffer.current.push(event);
    record(e.key, "keyup");
  };

  const handlePasteEvent = (e) => {
    handlePaste();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = await getSubmitPayload();
      const res = await fetch(`${API}/api/exam/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          candidateName,
          examId,
          code,
          ...payload,
        }),
      });
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
    } catch (err) {
      console.error("Submit failed:", err);
      alert("Submission failed. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && result) {
    return (
      <div style={styles.container}>
        <div style={styles.resultBox}>
          <h2 style={styles.resultTitle}>Submission Received</h2>
          <p>Session: <code>{sessionId.current}</code></p>
          <p>Merkle Integrity: <strong style={{ color: result.merkleValid ? "#22c55e" : "#ef4444" }}>
            {result.merkleValid ? "✓ VALID" : "✗ TAMPERED"}
          </strong></p>
          <p>Verdict: <strong style={{ color: verdictColor(result.finalVerdict) }}>
            {result.finalVerdict}
          </strong></p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <span style={styles.logo}>ExamGuard</span>
        <span style={styles.meta}>{candidateName} · {examId}</span>
        {tabWarnings > 0 && (
          <span style={styles.warning}>⚠ Tab exits: {tabWarnings}</span>
        )}
      </header>

      <div style={styles.editorWrap}>
        <textarea
          style={styles.editor}
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPaste={handlePasteEvent}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Write your code here..."
        />
      </div>

      <div style={styles.chartSection}>
        <p style={styles.chartLabel}>Live Keystroke Analysis</p>
        <IntegrityChart keystrokes={keystrokes} />
      </div>

      <div style={styles.footer}>
        <span style={styles.counter}>{keystrokes.filter(e => e.type === "keydown").length} keystrokes</span>
        <button
          style={{ ...styles.btn, opacity: submitting ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit Exam"}
        </button>
      </div>
    </div>
  );
}

function verdictColor(v) {
  return { CLEAN: "#22c55e", SUSPICIOUS: "#f59e0b", FLAGGED: "#ef4444", PENDING: "#94a3b8" }[v] || "#fff";
}

const styles = {
  container: { background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "monospace", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", gap: 16, padding: "12px 24px", borderBottom: "1px solid #1e293b" },
  logo: { fontWeight: 700, fontSize: 18, color: "#38bdf8" },
  meta: { color: "#64748b", fontSize: 13 },
  warning: { marginLeft: "auto", color: "#f59e0b", fontWeight: 600 },
  editorWrap: { flex: 1, padding: "0 24px" },
  editor: { width: "100%", minHeight: 320, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, padding: 16, fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", fontFamily: "monospace", boxSizing: "border-box", marginTop: 16 },
  chartSection: { padding: "12px 24px" },
  chartLabel: { fontSize: 11, color: "#475569", marginBottom: 6 },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderTop: "1px solid #1e293b" },
  counter: { fontSize: 12, color: "#475569" },
  btn: { background: "#38bdf8", color: "#0f172a", border: "none", borderRadius: 6, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  resultBox: { margin: "80px auto", maxWidth: 480, background: "#1e293b", borderRadius: 12, padding: 32 },
  resultTitle: { marginTop: 0, color: "#38bdf8" },
};