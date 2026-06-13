from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from keystroke import analyze_keystrokes
from ast_diff import compute_ast_similarity

app = FastAPI(title="ExamGuard Analyzer")


class KeystrokeEvent(BaseModel):
    key: str
    type: str          # "keydown" | "keyup"
    timestamp: float   # ms epoch


class AnalyzeRequest(BaseModel):
    keystrokes: List[KeystrokeEvent]
    code: Optional[str] = ""


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    events = [e.dict() for e in req.keystrokes]

    ks_result = analyze_keystrokes(events)

    ast_similarity = 0.0
    if req.code:
        ast_similarity = compute_ast_similarity(req.code)

    # Verdict thresholds (tune these)
    anomaly = ks_result["anomaly_score"]
    verdict = "CLEAN"
    if anomaly > 0.75 or ast_similarity > 0.85:
        verdict = "FLAGGED"
    elif anomaly > 0.45 or ast_similarity > 0.60:
        verdict = "SUSPICIOUS"

    return {
        **ks_result,
        "ast_similarity": round(ast_similarity, 4),
        "verdict": verdict,
    }


@app.get("/health")
def health():
    return {"status": "ok"}