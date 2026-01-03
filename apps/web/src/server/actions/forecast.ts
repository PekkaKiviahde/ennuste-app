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
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const createForecastAction = async (
  _state: ForecastFormState,
  formData: FormData
): Promise<ForecastFormState> => {
  try {
    const session = requireSession();
    const services = createServices();

    const targetLitteraId = String(formData.get("targetLitteraId") ?? "").trim();
    const mappingVersionId = String(formData.get("mappingVersionId") ?? "").trim() || null;

    if (!targetLitteraId) {
      return { ok: false, message: null, error: "Tavoitearvio-littera puuttuu." };
    }

    const lines = [
      {
        costType: "LABOR" as const,
        forecastValue: parseNumber(formData.get("laborValue")),
        memoGeneral: String(formData.get("laborMemo") ?? "") || null
      },
      {
        costType: "MATERIAL" as const,
        forecastValue: parseNumber(formData.get("materialValue")),
        memoGeneral: String(formData.get("materialMemo") ?? "") || null
      },
      {
        costType: "SUBCONTRACT" as const,
        forecastValue: parseNumber(formData.get("subcontractValue")),
        memoGeneral: String(formData.get("subcontractMemo") ?? "") || null
      },
      {
        costType: "RENTAL" as const,
        forecastValue: parseNumber(formData.get("rentalValue")),
        memoGeneral: String(formData.get("rentalMemo") ?? "") || null
      },
      {
        costType: "OTHER" as const,
        forecastValue: parseNumber(formData.get("otherValue")),
        memoGeneral: String(formData.get("otherMemo") ?? "") || null
      }
    ];

    const comment = String(formData.get("comment") ?? "").trim();
    const technicalProgress = parseNumber(formData.get("technicalProgress")) / 100;
    const financialProgress = parseNumber(formData.get("financialProgress")) / 100;
    const kpiValue = parseNumber(formData.get("kpiValue"));

    const hasLineValues = lines.some((line) => line.forecastValue > 0 || Boolean(line.memoGeneral));
    const hasMeta = Boolean(comment) || technicalProgress > 0 || financialProgress > 0 || kpiValue > 0;

    if (!hasLineValues && !hasMeta) {
      return { ok: false, message: null, error: "Syota ainakin yksi ennustearvo tai perustelu." };
    }

    const result = await createForecastEvent(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      targetLitteraId,
      mappingVersionId,
      comment: comment || null,
      technicalProgress: technicalProgress || null,
      financialProgress: financialProgress || null,
      kpiValue: kpiValue || null,
      createdBy: session.username,
      lines
    });

    return { ok: true, message: `Ennuste tallennettu (${result.forecastEventId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ennusteen tallennus epaonnistui.";
    return { ok: false, message: null, error: message };
  }
};
