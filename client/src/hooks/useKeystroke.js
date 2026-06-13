import { useRef, useCallback, useEffect } from "react";
// polyfilled via Vite — or use the Web Crypto API below

// --- Web Crypto SHA-256 (no polyfill needed) ---
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function buildMerkleRoot(events) {
  if (!events || events.length === 0) return null;
  let layer = await Promise.all(
    events.map(e => sha256(`${e.key}:${e.type}:${e.timestamp}`))
  );
  while (layer.length > 1) {
    if (layer.length % 2 !== 0) layer.push(layer[layer.length - 1]);
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      next.push(await sha256(layer[i] + layer[i + 1]));
    }
    layer = next;
  }
  return layer[0];
}

export function useKeystroke({ onTabExit } = {}) {
  const keystrokesRef = useRef([]);   // raw event log
  const tabExitsRef = useRef(0);
  const pasteCountRef = useRef(0);
  const merkleRootRef = useRef(null); // updated on every submit

  // Record a keystroke event
  const record = useCallback((key, type) => {
    keystrokesRef.current.push({ key, type, timestamp: Date.now() });
  }, []);

  // Tab-visibility tracking
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        tabExitsRef.current += 1;
        onTabExit?.({ count: tabExitsRef.current, timestamp: Date.now() });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [onTabExit]);

  // Paste tracking
  const handlePaste = useCallback(() => {
    pasteCountRef.current += 1;
  }, []);

  // Build and cache Merkle root, return payload ready to POST
  const getSubmitPayload = useCallback(async () => {
    const events = keystrokesRef.current;
    const root = await buildMerkleRoot(events);
    merkleRootRef.current = root;
    return {
      keystrokes: events,
      merkleRoot: root,
      tabExits: tabExitsRef.current,
      pasteCount: pasteCountRef.current,
    };
  }, []);

  // Expose live stats for IntegrityChart
  const getStats = useCallback(() => ({
    keystrokeCount: keystrokesRef.current.length,
    tabExits: tabExitsRef.current,
    pasteCount: pasteCountRef.current,
    merkleRoot: merkleRootRef.current,
  }), []);

  return { record, handlePaste, getSubmitPayload, getStats };
}