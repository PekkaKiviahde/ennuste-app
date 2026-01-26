"use server";

import { createForecastEvent } from "@ennuste/application";
import { createServices } from "../services";
import { requireSession } from "../session";

export type ForecastFormState = {
  ok: boolean;
  message: string | null;
  error: string | null;
};

const parseNumber = (value: FormDataEntryValue | null) => {
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const createForecastAction = async (
  _state: ForecastFormState,
  formData: FormData
): Promise<ForecastFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();

    const targetLitteraId = String(formData.get("targetLitteraId") ?? "").trim();
    const mappingVersionId = String(formData.get("mappingVersionId") ?? "").trim() || null;

    if (!targetLitteraId) {
      return { ok: false, message: null, error: "Valitse tavoitearvio-littera ennen tallennusta." };
    }

    const lines = [
      {
        costType: "LABOR" as const,
        forecastValue: parseNumber(formData.get("laborValue")) ?? 0,
        memoGeneral: String(formData.get("laborMemo") ?? "") || null
      },
      {
        costType: "MATERIAL" as const,
        forecastValue: parseNumber(formData.get("materialValue")) ?? 0,
        memoGeneral: String(formData.get("materialMemo") ?? "") || null
      },
      {
        costType: "SUBCONTRACT" as const,
        forecastValue: parseNumber(formData.get("subcontractValue")) ?? 0,
        memoGeneral: String(formData.get("subcontractMemo") ?? "") || null
      },
      {
        costType: "RENTAL" as const,
        forecastValue: parseNumber(formData.get("rentalValue")) ?? 0,
        memoGeneral: String(formData.get("rentalMemo") ?? "") || null
      },
      {
        costType: "OTHER" as const,
        forecastValue: parseNumber(formData.get("otherValue")) ?? 0,
        memoGeneral: String(formData.get("otherMemo") ?? "") || null
      }
    ];

    const comment = String(formData.get("comment") ?? "").trim();
    const technicalRaw = parseNumber(formData.get("technicalProgress"));
    const financialRaw = parseNumber(formData.get("financialProgress"));
    const kpiRaw = parseNumber(formData.get("kpiValue"));

    if (technicalRaw !== null && (technicalRaw < 0 || technicalRaw > 100)) {
      return { ok: false, message: null, error: "Tekninen valmius tulee olla 0-100." };
    }
    if (financialRaw !== null && (financialRaw < 0 || financialRaw > 100)) {
      return { ok: false, message: null, error: "Taloudellinen valmius tulee olla 0-100." };
    }
    if (kpiRaw !== null && kpiRaw < 0) {
      return { ok: false, message: null, error: "KPI-arvo ei voi olla negatiivinen." };
    }
    if (lines.some((line) => line.forecastValue < 0)) {
      return { ok: false, message: null, error: "Kustannuslajien ennusteet eivat voi olla negatiivisia." };
    }

    const technicalProgress = technicalRaw !== null ? technicalRaw / 100 : null;
    const financialProgress = financialRaw !== null ? financialRaw / 100 : null;
    const kpiValue = kpiRaw ?? null;

    const hasLineValues = lines.some((line) => line.forecastValue > 0 || Boolean(line.memoGeneral));
    const hasMeta =
      Boolean(comment) || (technicalProgress ?? 0) > 0 || (financialProgress ?? 0) > 0 || (kpiValue ?? 0) > 0;

    if (!hasLineValues && !hasMeta) {
      return { ok: false, message: null, error: "Anna ennustearvo tai perustelu (kommentti tai valmiusprosentti)." };
    }

    const result = await createForecastEvent(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      targetLitteraId,
      mappingVersionId,
      comment: comment || null,
      technicalProgress,
      financialProgress,
      kpiValue,
      createdBy: session.username,
      lines
    });

    return { ok: true, message: `Ennuste tallennettu (${result.forecastEventId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ennusteen tallennus epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};
