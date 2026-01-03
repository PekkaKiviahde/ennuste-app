"use server";

import { createPlanningEvent } from "@ennuste/application";
import { createServices } from "../services";
import { requireSession } from "../session";

export type PlanningFormState = {
  ok: boolean;
  message: string | null;
  error: string | null;
};

export const createPlanningAction = async (
  _state: PlanningFormState,
  formData: FormData
): Promise<PlanningFormState> => {
  try {
    const session = requireSession();
    const services = createServices();

    const targetLitteraId = String(formData.get("targetLitteraId") ?? "").trim();
    const status = String(formData.get("status") ?? "DRAFT") as "DRAFT" | "READY_FOR_FORECAST" | "LOCKED";

    if (!targetLitteraId) {
      return { ok: false, message: null, error: "Tavoitearvio-littera puuttuu." };
    }

    const result = await createPlanningEvent(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      targetLitteraId,
      status,
      summary: String(formData.get("summary") ?? "") || null,
      observations: String(formData.get("observations") ?? "") || null,
      risks: String(formData.get("risks") ?? "") || null,
      decisions: String(formData.get("decisions") ?? "") || null,
      createdBy: session.username
    });

    return { ok: true, message: `Suunnitelma tallennettu (${result.planningEventId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Suunnitelman tallennus epaonnistui.";
    return { ok: false, message: null, error: message };
  }
};
