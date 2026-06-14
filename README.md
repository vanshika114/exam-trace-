# ExamGuard

> Cryptographic exam integrity system — every keystroke proven, not just logged.

ExamGuard is a full-stack proctoring system that uses Merkle tree hashing to cryptographically verify keystroke logs, behavioral analysis to detect anomalous typing patterns, and AST similarity scoring to catch code copied from external sources.

---

## How it works

**1. Client — Keystroke Merkle tree**
Every `keydown` and `keyup` event is timestamped and SHA-256 hashed using the browser's Web Crypto API. All leaf hashes are combined into a single Merkle root — a cryptographic fingerprint of the entire typing session — which is submitted alongside the keystroke log.

**2. Server — Root validation**
Express independently recomputes the Merkle root from the submitted keystroke log. If the client root and server root don't match, the session is immediately flagged as tampered — before behavioral analysis even runs.

**3. Analyzer — Behavioral + AST scoring**
A Python FastAPI service scores:
- **Hold time** — how long each key is pressed (mean + std deviation)
- **Inter-key gaps (IKG)** — time between successive keystrokes; sub-30ms bursts indicate injection
- **Anomaly score** — composite score from hold time and burst ratio
- **AST similarity** — compares submitted code against known solutions using difflib + AST node histograms

---

## Verdicts

| Verdict | Trigger |
|---|---|
| `CLEAN` | Merkle valid, anomaly score < 0.45, AST similarity < 60% |
| `SUSPICIOUS` | Anomaly score > 0.45 or AST similarity > 60% |
| `FLAGGED` | Merkle mismatch, anomaly > 0.75, or AST similarity > 85% |

---

## File structure

```
examguard/
├── docker-compose.yml
├── client/
│   ├── index.html               # Landing page
│   ├── app.html                 # React app entry point
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── hooks/
│       │   └── useKeystroke.js  # Keystroke log, Merkle tree, tab-exit tracking
│       └── components/
│           ├── ExamEditor.jsx   # Candidate exam UI
│           ├── IntegrityChart.jsx  # Live inter-key gap chart
│           └── JudgeDashboard.jsx  # Verdict review UI
├── server/
│   ├── index.js                 # Express bootstrap
│   ├── .env
│   ├── package.json
│   ├── routes/
│   │   └── exam.js              # Merkle validation + analyzer orchestration
│   └── models/
│       └── Session.js           # MongoDB schema
└── analyzer/
    ├── main.py                  # FastAPI wrapper
    ├── keystroke.py             # Hold time, IKG, anomaly score
    ├── ast_diff.py              # AST similarity scoring
    └── requirements.txt
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Web Crypto API |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Analyzer | Python 3.11, FastAPI, Uvicorn |
| Hashing | SHA-256 (Web Crypto + Node crypto) |
| AST analysis | Python `ast` module, `difflib` |
| Container | Docker, docker-compose |

---

## Running locally (without Docker)

You need Node.js v18+, Python 3.11, and MongoDB installed.

### Terminal 1 — MongoDB
```bash
mongod --dbpath C:\data\db
```

### Terminal 2 — Python analyzer
```bash
cd analyzer
"C:\Users\...\Python311\python.exe" -m pip install fastapi uvicorn pydantic
"C:\Users\...\Python311\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 3 — Express server
```bash
cd server
npm install
node index.js
```

### Terminal 4 — React client
```bash
cd client
npm install
npm run dev
```

### URLs

| URL | Page |
|---|---|
| `http://localhost:5173` | Landing page |
| `http://localhost:5173/app.html` | Exam editor (candidate view) |
| `http://localhost:5173/app.html#judge` | Judge dashboard |
| `http://localhost:3001/health` | Server health check |
| `http://localhost:8000/health` | Analyzer health check |

---

## Running with Docker

```bash
docker-compose up --build
```

First run takes 3–5 minutes. All four services (client, server, analyzer, MongoDB) start automatically and are networked together.

---

## Environment variables

Create `server/.env`:

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/examguard
ANALYZER_URL=http://localhost:8000
```

For Docker, `MONGO_URI` should use `mongodb://mongo:27017/examguard` (Docker internal hostname).

---

## Key design decisions

**Why Merkle trees?**
A flat hash of the keystroke log can be forged by recomputing it after modification. A Merkle tree root is recomputed independently server-side from the raw event list — any alteration to any event (key, type, or timestamp) produces a different root. The comparison is the proof.

**Why Python for the analyzer?**
Python's `ast` module gives direct access to the parse tree of submitted code with zero extra dependencies. The `difflib.SequenceMatcher` + cosine similarity on AST node histograms approach is readable, tunable, and doesn't require training data.

**Why sub-30ms as the burst threshold?**
Human inter-key gaps average 100–200ms for normal typing. Sub-30ms gaps in sequence are physically impossible without mechanical assistance. The threshold is conservative — it will not flag fast typists, only injected or pasted input.

---

## Extending the project

**Add more reference solutions for AST comparison**
Edit the `REFERENCE_SOLUTIONS` list in `analyzer/ast_diff.py`. Each entry is a plain Python string containing a code snippet.

**Tune verdict thresholds**
Edit the threshold values in `analyzer/main.py`:
```python
if anomaly > 0.75 or ast_similarity > 0.85:
    verdict = "FLAGGED"
elif anomaly > 0.45 or ast_similarity > 0.60:
    verdict = "SUSPICIOUS"
```

**Change the candidate name / exam ID**
Edit `ExamEditor` props in `client/src/App.jsx`:
```jsx
<ExamEditor candidateName="Alice Smith" examId="midterm_2025" />
```

---

## Notes

- Python 3.14 is not supported — use Python 3.11. The `pydantic-core` package requires a compiled Rust extension that has no wheel for 3.14 yet.
- The `.env` file is excluded from version control. Never commit credentials.
- The judge dashboard auto-refreshes sessions on page load. Reload the page after a new submission to see it appear.
