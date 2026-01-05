export type PlanningRow = {
  planning_event_id?: string | null;
  target_littera_id?: string | null;
  status?: string | null;
  event_time?: string | null;
};

type PlanningCandidate = {
  row: PlanningRow;
  time: number;
  index: number;
};

const toEventTime = (row: PlanningRow) => {
  if (!row?.event_time) return 0;
  const parsed = Date.parse(row.event_time);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const pickNewest = (current: PlanningCandidate | undefined, candidate: PlanningCandidate) => {
  if (!current) return candidate;
  if (candidate.time > current.time) return candidate;
  if (candidate.time < current.time) return current;
  if (candidate.index > current.index) return candidate;
  return current;
};

export const selectEffectivePlanningRows = <Row extends PlanningRow>(rows: Row[]) => {
  const grouped = new Map<string, { newest?: PlanningCandidate; locked?: PlanningCandidate }>();

  rows.forEach((row, index) => {
    const targetId = row?.target_littera_id;
    if (!targetId) return;

    const candidate: PlanningCandidate = {
      row,
      time: toEventTime(row),
      index
    };

    const existing = grouped.get(targetId) ?? {};
    existing.newest = pickNewest(existing.newest, candidate);
    if (row.status === "LOCKED") {
      existing.locked = pickNewest(existing.locked, candidate);
    }
    grouped.set(targetId, existing);
  });

  return Array.from(grouped.values())
    .map((entry) => entry.locked ?? entry.newest)
    .filter((entry): entry is PlanningCandidate => Boolean(entry))
    .sort((a, b) => {
      if (a.time !== b.time) return b.time - a.time;
      return b.index - a.index;
    })
    .map((entry) => entry.row as Row);
};

