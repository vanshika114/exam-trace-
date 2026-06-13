import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const VERDICT_COLOR = {
  CLEAN: "#22c55e",
  SUSPICIOUS: "#f59e0b",
  FLAGGED: "#ef4444",
  PENDING: "#94a3b8",
};

export default function JudgeDashboard() {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/exam/sessions`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const select = async (sessionId) => {
    const res = await fetch(`${API}/api/exam/session/${sessionId}`);
    const data = await res.json();
    setSelected(data);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>ExamGuard</span>
        <span style={styles.role}>Judge Dashboard</span>
      </header>

      <div style={styles.body}>
        {/* Session list */}
        <aside style={styles.sidebar}>
          <p style={styles.sideLabel}>Sessions ({sessions.length})</p>
          {loading && <p style={{ color: "#475569" }}>Loading…</p>}
          {sessions.map(s => (
            <div
              key={s.sessionId}
              onClick={() => select(s.sessionId)}
              style={{ ...styles.sessionRow, background: selected?.sessionId === s.sessionId ? "#1e3a5f" : "transparent" }}
            >
              <span style={styles.name}>{s.candidateName}</span>
              <span style={{ color: VERDICT_COLOR[s.finalVerdict], fontWeight: 700, fontSize: 11 }}>
                {s.finalVerdict}
              </span>
            </div>
          ))}
        </aside>

        {/* Detail panel */}
        <main style={styles.detail}>
          {!selected && <p style={{ color: "#475569" }}>Select a session to inspect.</p>}
          {selected && (
            <>
              <h2 style={styles.detailName}>{selected.candidateName}</h2>
              <p style={styles.sub}>Session: <code>{selected.sessionId}</code> · Exam: {selected.examId}</p>

              <div style={styles.verdictBadge(selected.finalVerdict)}>
                {selected.finalVerdict}
              </div>

              <div style={styles.grid}>
                <Stat label="Merkle Valid" value={selected.merkleValid ? "✓ YES" : "✗ NO"} warn={!selected.merkleValid} />
                <Stat label="Tab Exits" value={selected.tabExits} warn={selected.tabExits > 2} />
                <Stat label="Paste Events" value={selected.pasteCount} warn={selected.pasteCount > 0} />
                <Stat label="Keystrokes" value={selected.keystrokes?.length ?? "—"} />
              </div>

              {selected.analyzerResult && (
                <div style={styles.section}>
                  <p style={styles.sectionLabel}>Analyzer Metrics</p>
                  <div style={styles.grid}>
                    <Stat label="Anomaly Score" value={selected.analyzerResult.anomalyScore?.toFixed(3)} warn={selected.analyzerResult.anomalyScore > 0.45} />
                    <Stat label="Hold Time Mean" value={`${selected.analyzerResult.holdTimeMean} ms`} />
                    <Stat label="Hold Time Std" value={`${selected.analyzerResult.holdTimeStd} ms`} />
                    <Stat label="IKG Mean" value={`${selected.analyzerResult.ikgMean} ms`} />
                    <Stat label="IKG Std" value={`${selected.analyzerResult.ikgStd} ms`} />
                    <Stat label="AST Similarity" value={selected.analyzerResult.astSimilarity?.toFixed(3)} warn={selected.analyzerResult.astSimilarity > 0.6} />
                  </div>
                </div>
              )}

              <div style={styles.section}>
                <p style={styles.sectionLabel}>Merkle Roots</p>
                <p style={styles.mono}>Client: {selected.merkleRoot || "—"}</p>
                <p style={styles.mono}>Server: {selected.serverMerkleRoot || "—"}</p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div style={styles.statBox}>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statVal, color: warn ? "#ef4444" : "#e2e8f0" }}>{value ?? "—"}</p>
    </div>
  );
}

const styles = {
  page: { background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "monospace" },
  header: { display: "flex", alignItems: "center", gap: 16, padding: "12px 24px", borderBottom: "1px solid #1e293b" },
  logo: { fontWeight: 700, fontSize: 18, color: "#38bdf8" },
  role: { color: "#64748b", fontSize: 13 },
  body: { display: "flex", height: "calc(100vh - 49px)" },
  sidebar: { width: 260, borderRight: "1px solid #1e293b", padding: 16, overflowY: "auto" },
  sideLabel: { fontSize: 11, color: "#475569", marginBottom: 8, textTransform: "uppercase" },
  sessionRow: { padding: "10px 8px", borderRadius: 6, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  name: { fontSize: 13 },
  detail: { flex: 1, padding: 32, overflowY: "auto" },
  detailName: { marginTop: 0, fontSize: 22, color: "#38bdf8" },
  sub: { color: "#64748b", fontSize: 12, marginBottom: 20 },
  verdictBadge: (v) => ({
    display: "inline-block",
    padding: "4px 16px",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 13,
    color: "#0f172a",
    background: { CLEAN: "#22c55e", SUSPICIOUS: "#f59e0b", FLAGGED: "#ef4444", PENDING: "#94a3b8" }[v] || "#94a3b8",
    marginBottom: 24,
  }),
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 },
  statBox: { background: "#1e293b", borderRadius: 8, padding: 14 },
  statLabel: { fontSize: 10, color: "#475569", margin: "0 0 4px", textTransform: "uppercase" },
  statVal: { fontSize: 16, fontWeight: 700, margin: 0 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, color: "#475569", textTransform: "uppercase", marginBottom: 8 },
  mono: { fontSize: 11, color: "#64748b", wordBreak: "break-all", margin: "2px 0" },
};