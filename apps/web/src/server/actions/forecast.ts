"use server";

import { createForecastEvent } from "@ennuste/application";
import { createServices } from "../services";
import { requireSession } from "../session";

export const createForecastAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();

  const targetLitteraId = String(formData.get("targetLitteraId") ?? "");
  const mappingVersionId = String(formData.get("mappingVersionId") ?? "") || null;

  const lines = [
    {
      costType: "LABOR" as const,
      forecastValue: Number(formData.get("laborValue") ?? 0),
      memoGeneral: String(formData.get("laborMemo") ?? "") || null
    },
    {
      costType: "MATERIAL" as const,
      forecastValue: Number(formData.get("materialValue") ?? 0),
      memoGeneral: String(formData.get("materialMemo") ?? "") || null
    },
    {
      costType: "SUBCONTRACT" as const,
      forecastValue: Number(formData.get("subcontractValue") ?? 0),
      memoGeneral: String(formData.get("subcontractMemo") ?? "") || null
    },
    {
      costType: "RENTAL" as const,
      forecastValue: Number(formData.get("rentalValue") ?? 0),
      memoGeneral: String(formData.get("rentalMemo") ?? "") || null
    },
    {
      costType: "OTHER" as const,
      forecastValue: Number(formData.get("otherValue") ?? 0),
      memoGeneral: String(formData.get("otherMemo") ?? "") || null
    }
  ];

  const result = await createForecastEvent(services, {
    projectId: session.projectId,
    targetLitteraId,
    mappingVersionId,
    comment: String(formData.get("comment") ?? "") || null,
    technicalProgress: Number(formData.get("technicalProgress") ?? 0) / 100,
    financialProgress: Number(formData.get("financialProgress") ?? 0) / 100,
    kpiValue: Number(formData.get("kpiValue") ?? 0),
    createdBy: session.username,
    lines
  });

  return { ok: true, forecastEventId: result.forecastEventId };
};
