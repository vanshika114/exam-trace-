import { useEffect, useRef } from "react";

const W = 600, H = 140, PAD = 30;

/**
 * Live rolling chart of keystroke inter-key gaps.
 * Spikes in red = bursts under 30ms (suspicious paste/injection events).
 */
export default function IntegrityChart({ keystrokes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Compute IKGs from raw keystroke log
    const downs = keystrokes.filter(e => e.type === "keydown");
    const gaps = [];
    for (let i = 1; i < downs.length; i++) {
      gaps.push(downs[i].timestamp - downs[i - 1].timestamp);
    }

    const visible = gaps.slice(-100); // last 100 gaps
    const maxGap = Math.max(...visible, 500);

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let y = PAD; y < H - PAD; y += 20) {
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    }

    // 30ms threshold line (red)
    const threshY = H - PAD - (30 / maxGap) * (H - 2 * PAD);
    ctx.strokeStyle = "#ef444455";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(PAD, threshY); ctx.lineTo(W - PAD, threshY); ctx.stroke();
    ctx.setLineDash([]);

    if (visible.length < 2) return;

    const xStep = (W - 2 * PAD) / (visible.length - 1);

    // Line path
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    visible.forEach((gap, i) => {
      const x = PAD + i * xStep;
      const y = H - PAD - (Math.min(gap, maxGap) / maxGap) * (H - 2 * PAD);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();

    // Red spikes for sub-30ms bursts
    visible.forEach((gap, i) => {
      if (gap < 30) {
        const x = PAD + i * xStep;
        const y = H - PAD - (Math.min(gap, maxGap) / maxGap) * (H - 2 * PAD);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      }
    });

    // Label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText("Inter-key gaps (ms) — red = <30ms burst", PAD, 14);
  }, [keystrokes]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ borderRadius: 8, width: "100%", maxWidth: W }}
    />
  );
}