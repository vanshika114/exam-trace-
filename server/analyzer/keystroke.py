import statistics
import math
from typing import List, Dict, Any


def analyze_keystrokes(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute hold times, inter-key gaps, and a composite anomaly score.
    Hold time  = keyup.timestamp - keydown.timestamp for the same key.
    Inter-key gap (IKG) = keydown[n].timestamp - keydown[n-1].timestamp
    """

    # --- Separate down and up events ---
    downs: Dict[str, float] = {}   # key -> last keydown timestamp
    hold_times = []
    down_timestamps = []

    for e in events:
        k = e["key"]
        t = e["timestamp"]

        if e["type"] == "keydown":
            downs[k] = t
            down_timestamps.append(t)
        elif e["type"] == "keyup" and k in downs:
            ht = t - downs[k]
            if 0 < ht < 2000:   # sanity filter — ignore held keys > 2s
                hold_times.append(ht)
            downs.pop(k, None)

    # --- Inter-key gaps (successive keydowns) ---
    ikgs = []
    for i in range(1, len(down_timestamps)):
        gap = down_timestamps[i] - down_timestamps[i - 1]
        if 0 < gap < 5000:   # ignore gaps > 5s (thinking time)
            ikgs.append(gap)

    def safe_stats(data):
        if len(data) < 2:
            return 0.0, 0.0
        return round(statistics.mean(data), 2), round(statistics.stdev(data), 2)

    ht_mean, ht_std = safe_stats(hold_times)
    ikg_mean, ikg_std = safe_stats(ikgs)

    # --- Anomaly Score ---
    # Logic: real typists have moderate, consistent hold times and gaps.
    # Paste-style injections produce zero hold times and near-zero gaps.
    # External tools produce perfectly uniform timing (low std, suspiciously fast).

    score = 0.0

    if hold_times:
        # Too-low mean hold time (< 20ms) → likely injected
        if ht_mean < 20:
            score += 0.4
        # Very low std with non-trivial count → robotic
        if ht_std < 5 and len(hold_times) > 20:
            score += 0.2

    if ikgs:
        # Bursts: many IKGs < 30ms = suspicious paste or injection
        fast_bursts = sum(1 for g in ikgs if g < 30)
        burst_ratio = fast_bursts / len(ikgs)
        score += burst_ratio * 0.4

    # Normalize to [0, 1]
    score = min(round(score, 4), 1.0)

    return {
        "hold_time_mean": ht_mean,
        "hold_time_std": ht_std,
        "ikg_mean": ikg_mean,
        "ikg_std": ikg_std,
        "keystroke_count": len(down_timestamps),
        "anomaly_score": score,
    }