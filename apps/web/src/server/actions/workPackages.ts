"use server";

import {
  approveCorrectionFinal,
  approveCorrectionPm,
  createGhostEntry,
  createWeeklyUpdate,
  lockBaseline,
  proposeCorrection
} from "@ennuste/application";
import { createServices } from "../services";
import { requireSession } from "../session";

export type WorkPackageFormState = {
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

export const createWeeklyUpdateAction = async (
  _state: WorkPackageFormState,
  formData: FormData
): Promise<WorkPackageFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();
    const workPackageId = String(formData.get("workPackageId") ?? "").trim();
    const weekEnding = String(formData.get("weekEnding") ?? "").trim();
    const percentComplete = parseNumber(formData.get("percentComplete"));

    if (!workPackageId || !weekEnding) {
      return { ok: false, message: null, error: "Työpaketti ja päivämäärä ovat pakollisia." };
    }
    if (percentComplete < 0 || percentComplete > 100) {
      return { ok: false, message: null, error: "Valmiusasteen tulee olla 0-100." };
    }

    const result = await createWeeklyUpdate(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      workPackageId,
      weekEnding,
      percentComplete,
      progressNotes: String(formData.get("progressNotes") ?? "") || null,
      risks: String(formData.get("risks") ?? "") || null,
      username: session.username
    });
    return { ok: true, message: `Viikkopäivitys tallennettu (${result.workPackageWeeklyUpdateId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Viikkopäivitys epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};

export const createGhostEntryAction = async (
  _state: WorkPackageFormState,
  formData: FormData
): Promise<WorkPackageFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();
    const workPackageId = String(formData.get("workPackageId") ?? "").trim();
    const weekEnding = String(formData.get("weekEnding") ?? "").trim();
    const amount = parseNumber(formData.get("amount"));

    if (!workPackageId || !weekEnding) {
      return { ok: false, message: null, error: "Työpaketti ja päivämäärä ovat pakollisia." };
    }
    if (amount <= 0) {
      return { ok: false, message: null, error: "Määrän tulee olla suurempi kuin 0." };
    }

    const result = await createGhostEntry(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      workPackageId,
      weekEnding,
      costType: String(formData.get("costType") ?? "LABOR") as "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER",
      amount,
      description: String(formData.get("description") ?? "") || null,
      username: session.username
    });
    return { ok: true, message: `Ghost kirjattu (${result.ghostCostEntryId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ghost-kirjaus epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};

export const lockBaselineAction = async (
  _state: WorkPackageFormState,
  formData: FormData
): Promise<WorkPackageFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();
    const workPackageId = String(formData.get("workPackageId") ?? "").trim();
    const workPackageVersionId = String(formData.get("workPackageVersionId") ?? "").trim();
    const targetImportBatchId = String(formData.get("targetImportBatchId") ?? "").trim();

    if (!workPackageId || !workPackageVersionId || !targetImportBatchId) {
      return { ok: false, message: null, error: "Työpaketti, versio ja batch ID ovat pakollisia." };
    }

    const result = await lockBaseline(services, {
      projectId: session.projectId,
      workPackageId,
      workPackageVersionId,
      targetImportBatchId,
      tenantId: session.tenantId,
      notes: String(formData.get("notes") ?? "") || null,
      username: session.username
    });
    return { ok: true, message: `Baseline lukittu (${result.workPackageBaselineId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Baseline-lukitus epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};

export const proposeCorrectionAction = async (
  _state: WorkPackageFormState,
  formData: FormData
): Promise<WorkPackageFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();
    const workPackageId = String(formData.get("workPackageId") ?? "").trim();
    const itemCode = String(formData.get("itemCode") ?? "").trim();

    if (!workPackageId || !itemCode) {
      return { ok: false, message: null, error: "Työpaketti ja item code ovat pakollisia." };
    }

    const result = await proposeCorrection(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      workPackageId,
      itemCode,
      notes: String(formData.get("notes") ?? "") || null,
      username: session.username
    });
    return { ok: true, message: `Korjausehdotus tallennettu (${result.correctionId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Korjausehdotus epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};

export const approveCorrectionPmAction = async (
  _state: WorkPackageFormState,
  formData: FormData
): Promise<WorkPackageFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();
    const correctionId = String(formData.get("correctionId") ?? "").trim();
    if (!correctionId) {
      return { ok: false, message: null, error: "Korjaus ID on pakollinen." };
    }

    await approveCorrectionPm(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      correctionId,
      comment: String(formData.get("comment") ?? "") || null,
      username: session.username
    });
    return { ok: true, message: "Korjaus hyväksytty 1/2.", error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hyväksyntä epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};

export const approveCorrectionFinalAction = async (
  _state: WorkPackageFormState,
  formData: FormData
): Promise<WorkPackageFormState> => {
  try {
    const session = await requireSession();
    const services = createServices();
    const correctionId = String(formData.get("correctionId") ?? "").trim();
    if (!correctionId) {
      return { ok: false, message: null, error: "Korjaus ID on pakollinen." };
    }

    const result = await approveCorrectionFinal(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      correctionId,
      comment: String(formData.get("comment") ?? "") || null,
      username: session.username
    });
    return { ok: true, message: `Korjaus hyväksytty 2/2 (${result.baselineId}).`, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lopullinen hyväksyntä epäonnistui.";
    return { ok: false, message: null, error: message };
  }
};
