/*
 * Prescription duration parsing — SPEC §7.6. Powers the hold timer (§6.1).
 *
 * Given a free-text prescription, return the hold duration in seconds and
 * whether it is per-side, or `null` when the prescription is rep-based (no
 * duration). A parse miss MUST return null and fall back to manual entry —
 * never throw, never guess a wrong duration.
 *
 *   parseHold('3×30s')           -> { seconds: 30, perSide: false }
 *   parseHold('2×45 sec / side') -> { seconds: 45, perSide: true }
 *   parseHold('3×8 / leg')       -> null   (reps, not a hold)
 *   parseHold('30–45s')          -> { seconds: 30, perSide: false }  (lower bound)
 */

export interface Hold {
  seconds: number;
  perSide: boolean;
}

// A number, an optional range upper bound, then a time unit. En/em dashes are
// normalised to '-' before matching. The lower bound is used for ranges.
const DURATION_RE =
  /(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(sec(?:onds?)?|secs|s|min(?:utes?)?|mins)\b/i;

const PER_SIDE_RE = /\/\s*(side|leg|arm)\b|per\s+(side|leg|arm)\b/i;

export function parseHold(prescription: string): Hold | null {
  try {
    if (!prescription) return null;
    const text = String(prescription).replace(/[‒-―]/g, '-');

    const m = text.match(DURATION_RE);
    if (!m) return null;

    const lower = parseFloat(m[1]); // range -> lower bound
    if (!Number.isFinite(lower)) return null;

    const unit = m[3].toLowerCase();
    const seconds = unit.startsWith('m') ? Math.round(lower * 60) : lower;

    return { seconds, perSide: PER_SIDE_RE.test(text) };
  } catch {
    // Contract: never throw. Fall back to manual entry.
    return null;
  }
}
