export type WorkPhaseKpiInput = {
  bacTotal: number | null;
  percentComplete: number | null; // 0..100
  acTotal: number | null;
  ghostOpenTotal: number | null;
};

export type WorkPhaseKpi = {
  evValue: number | null;
  acStarTotal: number | null;
  cpi: number | null;
};

const round = (value: number, digits = 2): number => {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
};

export const calculateWorkPhaseKpi = (input: WorkPhaseKpiInput): WorkPhaseKpi => {
  const bac = input.bacTotal ?? null;
  const percent = input.percentComplete ?? null;
  const ac = input.acTotal ?? null;
  const ghost = input.ghostOpenTotal ?? null;

  if (bac === null || percent === null) {
    return { evValue: null, acStarTotal: null, cpi: null };
  }

  const evValue = round(bac * (percent / 100));
  const acStarTotal = ac === null && ghost === null ? null : round((ac ?? 0) + (ghost ?? 0));

  if (acStarTotal === null || acStarTotal <= 0) {
    return { evValue, acStarTotal, cpi: null };
  }

  const cpi = round(evValue / acStarTotal, 4);
  return { evValue, acStarTotal, cpi };
};
