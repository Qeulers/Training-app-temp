/*
 * Unit pluralisation — SPEC §7.4, ported verbatim from legacy `singular` /
 * `pluralise`. The exception list (`g`, `kg`, `tbsp`, `to taste`, …) comes from
 * `pluralisation_exceptions.json` and marks units that never inflect.
 *
 * Compound "<unit> each" (e.g. "bunch each") inflects only the head word.
 */

/** Fold a unit to its singular form, honouring the no-plural exceptions. */
export function singular(unit: string, exceptions: readonly string[]): string {
  if (!unit) return '';
  if (exceptions.indexOf(unit) !== -1) return unit;
  const each = unit.match(/^(.*?)\s+each$/);
  if (each) return singular(each[1], exceptions) + ' each';
  if (unit.slice(-3) === 'ies') return unit.slice(0, -3) + 'y';
  if (unit.slice(-1) === 's' && unit.slice(-2) !== 'ss') return unit.slice(0, -1);
  return unit;
}

/** Inflect a unit for count `n`, honouring the no-plural exceptions. */
export function pluralise(unit: string, n: number, exceptions: readonly string[]): string {
  if (!unit || n <= 1 || exceptions.indexOf(unit) !== -1) return unit;
  const each = unit.match(/^(.*?)\s+each$/);
  if (each) return pluralise(each[1], n, exceptions) + ' each';
  if (unit.slice(-1) === 'y') return unit.slice(0, -1) + 'ies';
  if (['h', 's', 'x'].indexOf(unit.slice(-1)) !== -1) return unit + 'es';
  return unit + 's';
}
