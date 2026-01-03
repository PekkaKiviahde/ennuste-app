"use server";

import { createPlanningEvent } from "@ennuste/application";
import { createServices } from "../services";
import { requireSession } from "../session";

export const createPlanningAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();

  const targetLitteraId = String(formData.get("targetLitteraId") ?? "");
  const status = String(formData.get("status") ?? "DRAFT") as "DRAFT" | "READY_FOR_FORECAST" | "LOCKED";

  const result = await createPlanningEvent(services, {
    projectId: session.projectId,
    targetLitteraId,
    status,
    summary: String(formData.get("summary") ?? "") || null,
    observations: String(formData.get("observations") ?? "") || null,
    risks: String(formData.get("risks") ?? "") || null,
    decisions: String(formData.get("decisions") ?? "") || null,
    createdBy: session.username
  });

  return { ok: true, planningEventId: result.planningEventId };
};
