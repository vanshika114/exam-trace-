"""
AST-based similarity detector.
Compares submitted code against common solution patterns using:
  1. difflib SequenceMatcher on normalized source
  2. AST structural fingerprint (node-type histogram)
  3. Complexity heuristic (cyclomatic proxy via branch-node count)

Returns a similarity score in [0, 1].
Higher = more likely copy-pasted from a known source.
"""

import ast
import difflib
import math
import re
from collections import Counter
from typing import Optional


# ---------------------------------------------------------------------------
# Known solution snippets — expand this list per exam
# In production, load from DB / exam config
# ---------------------------------------------------------------------------
REFERENCE_SOLUTIONS = [
    # Classic FizzBuzz
    """
for i in range(1, 101):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
""",
    # Binary search
    """
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
""",
]


def _normalize(code: str) -> str:
    """Strip comments, collapse whitespace, lowercase identifiers."""
    code = re.sub(r"#.*", "", code)
    code = re.sub(r'""".*?"""', '""', code, flags=re.DOTALL)
    code = re.sub(r"'''.*?'''", "''", code, flags=re.DOTALL)
    code = re.sub(r"\s+", " ", code).strip().lower()
    return code


def _difflib_similarity(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, a, b).ratio()


def _ast_fingerprint(code: str) -> Optional[Counter]:
    """Return node-type frequency histogram, or None if parse fails."""
    try:
        tree = ast.parse(code)
        return Counter(type(node).__name__ for node in ast.walk(tree))
    except SyntaxError:
        return None


def _fingerprint_similarity(fp1: Counter, fp2: Counter) -> float:
    """Cosine similarity between two AST histograms."""
    if not fp1 or not fp2:
        return 0.0
    keys = set(fp1) | set(fp2)
    dot = sum(fp1.get(k, 0) * fp2.get(k, 0) for k in keys)
    mag1 = math.sqrt(sum(v ** 2 for v in fp1.values()))
    mag2 = math.sqrt(sum(v ** 2 for v in fp2.values()))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


def _complexity_score(code: str) -> int:
    """
    Proxy for cyclomatic complexity: count branch nodes.
    High complexity code is less likely to be a trivial copy.
    (We use this as a weight dampener — complex original code
     matching a reference is still suspicious.)
    """
    try:
        tree = ast.parse(code)
        branch_types = (ast.If, ast.For, ast.While, ast.Try,
                        ast.ExceptHandler, ast.With, ast.comprehension)
        return sum(1 for node in ast.walk(tree) if isinstance(node, branch_types))
    except SyntaxError:
        return 0


def compute_ast_similarity(submitted_code: str) -> float:
    """
    Returns max similarity score against any reference solution.
    Weighted blend: 60% difflib surface similarity + 40% AST structural similarity.
    """
    if not submitted_code or not submitted_code.strip():
        return 0.0

    norm_submitted = _normalize(submitted_code)
    fp_submitted = _ast_fingerprint(submitted_code)

    max_score = 0.0

    for ref in REFERENCE_SOLUTIONS:
        norm_ref = _normalize(ref)
        fp_ref = _ast_fingerprint(ref)

        surface = _difflib_similarity(norm_submitted, norm_ref)
        structural = _fingerprint_similarity(fp_submitted, fp_ref) if fp_submitted and fp_ref else 0.0

        blended = 0.6 * surface + 0.4 * structural
        max_score = max(max_score, blended)

    return round(max_score, 4)