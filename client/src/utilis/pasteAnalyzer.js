/**
 * pasteAnalyzer.js
 * ─────────────────────
 * Detects anomalies in paste behavior:
 * - Large pastes (bulk code insertion)
 * - Rapid consecutive pastes
 * - Structural patterns (indentation consistency)
 * - Deviation from typing patterns
 */

export function analyzePaste(pastedContent, typingContext) {
  let anomalyScore = 0;
  const flags = [];

  // ── Flag 1: Large paste size (>500 chars = suspicious) ──
  if (pastedContent.length > 500) {
    anomalyScore += 0.3;
    flags.push("LARGE_PASTE");
  } else if (pastedContent.length > 200) {
    anomalyScore += 0.15;
  }

  // ── Flag 2: Suspicious content patterns ──
  if (detectCodeStructure(pastedContent)) {
    anomalyScore += 0.2;
    flags.push("CODE_BLOCK");
  }

  // ── Flag 3: Multiple consecutive newlines (formatted code) ──
  const newlineCount = (pastedContent.match(/\n/g) || []).length;
  if (newlineCount > 3) {
    anomalyScore += 0.15;
    flags.push("FORMATTED_CODE");
  }

  // ── Flag 4: Sudden typing speed change ──
  if (typingContext.recentTypingSpeed > 0 && typingContext.beforePasteSpeed > 0) {
    const speedDelta = Math.abs(
      typingContext.afterPasteSpeed - typingContext.beforePasteSpeed
    ) / (typingContext.beforePasteSpeed + 1);
    
    if (speedDelta > 0.5) {
      // >50% change in typing speed
      anomalyScore += 0.15;
      flags.push("TYPING_SPEED_CHANGE");
    }
  }

  // ── Flag 5: Indentation consistency (professional code) ──
  if (hasConsistentIndentation(pastedContent)) {
    anomalyScore += 0.1;
    flags.push("CONSISTENT_INDENT");
  }

  // ── Flag 6: Exact repetition of previous content ──
  if (
    typingContext.previousContent &&
    typingContext.previousContent.includes(pastedContent)
  ) {
    anomalyScore += 0.25;
    flags.push("DUPLICATE_CONTENT");
  }

  // Cap score at 1.0
  anomalyScore = Math.min(anomalyScore, 1.0);

  return {
    anomalyScore,
    flags,
    isSuspicious: anomalyScore > 0.45, // Threshold
    details: {
      contentLength: pastedContent.length,
      newlineCount,
      hasCodeStructure: flags.includes("CODE_BLOCK"),
      typingSpeedDelta: typingContext.beforePasteSpeed > 0
        ? (Math.abs(typingContext.afterPasteSpeed - typingContext.beforePasteSpeed) /
           (typingContext.beforePasteSpeed + 1)).toFixed(2)
        : 0,
    },
  };
}

/**
 * Detect if content looks like formatted code
 * (curly braces, semicolons, common programming keywords)
 */
function detectCodeStructure(content) {
  const codePatterns = [
    /[{}()[\]]/g,           // Brackets
    /;$/m,                   // Semicolons
    /\b(function|const|let|var|if|else|for|while|class|return)\b/i, // Keywords
    /=>|[+\-*\/=]{2,}/,      // Operators
  ];

  let matches = 0;
  codePatterns.forEach((pattern) => {
    if (pattern.test(content)) matches++;
  });

  return matches >= 2; // At least 2 code-like patterns
}

/**
 * Detect consistent spacing/indentation
 * (suggests copy-paste from formatted source)
 */
function hasConsistentIndentation(content) {
  const lines = content.split("\n");
  if (lines.length < 2) return false;

  let indentPatterns = {};
  lines.forEach((line) => {
    const match = line.match(/^(\s*)/);
    if (match) {
      const indent = match[1].length;
      indentPatterns[indent] = (indentPatterns[indent] || 0) + 1;
    }
  });

  // If >60% of lines have same indentation, it's consistent
  const maxPattern = Math.max(...Object.values(indentPatterns));
  return maxPattern / lines.length > 0.6;
}

/**
 * Calculate typing speed (chars per second)
 */
export function calculateTypingSpeed(keystrokes, timeWindowMs = 5000) {
  if (keystrokes.length < 2) return 0;

  const recentKeys = keystrokes.filter(
    (k) => Date.now() - k.timestamp < timeWindowMs
  );

  if (recentKeys.length < 2) return 0;

  const timeSpan = recentKeys[recentKeys.length - 1].timestamp - recentKeys[0].timestamp;
  if (timeSpan === 0) return 0;

  const charCount = recentKeys.filter((k) => k.type === "keydown").length;
  return (charCount / timeSpan) * 1000; // chars per second
}