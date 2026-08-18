/*
 * Status line for the wide-screen sidebar: current phase + days to the A race.
 * Reuses the shared planning context and the pure phase/date domain, so it never
 * disagrees with Today. Resilient — returns nulls while data loads.
 */
import { usePhases } from '@/data/reference';
import { usePlanning } from './usePlanning';
import { formatDate, daysBetween } from '@/domain/dates';
import { phase } from '@/domain/phase';

export function useShellStatus(): { phaseLabel: string | null; daysToRace: number | null } {
  const planning = usePlanning();
  const phases = usePhases();

  if (planning.loading || phases.isPending || planning.error || phases.error) {
    return { phaseLabel: null, daysToRace: null };
  }

  const today = formatDate(new Date());
  const ph = phase(today, planning.raceDate, planning.override);
  const meta = phases.data?.find((p) => p.slug === ph) ?? null;
  const daysToRace = planning.raceDate ? daysBetween(today, planning.raceDate) : null;

  return { phaseLabel: meta?.short_label ?? null, daysToRace };
}
