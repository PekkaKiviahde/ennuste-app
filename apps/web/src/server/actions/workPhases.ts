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

export const createWeeklyUpdateAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  const result = await createWeeklyUpdate(services, {
    projectId: session.projectId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    weekEnding: String(formData.get("weekEnding") ?? ""),
    percentComplete: Number(formData.get("percentComplete") ?? 0),
    progressNotes: String(formData.get("progressNotes") ?? "") || null,
    risks: String(formData.get("risks") ?? "") || null,
    username: session.username
  });
  return { ok: true, workPhaseWeeklyUpdateId: result.workPhaseWeeklyUpdateId };
};

export const createGhostEntryAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  const result = await createGhostEntry(services, {
    projectId: session.projectId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    weekEnding: String(formData.get("weekEnding") ?? ""),
    costType: String(formData.get("costType") ?? "LABOR") as "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER",
    amount: Number(formData.get("amount") ?? 0),
    description: String(formData.get("description") ?? "") || null,
    username: session.username
  });
  return { ok: true, ghostCostEntryId: result.ghostCostEntryId };
};

export const lockBaselineAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  const result = await lockBaseline(services, {
    projectId: session.projectId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    workPhaseVersionId: String(formData.get("workPhaseVersionId") ?? ""),
    targetImportBatchId: String(formData.get("targetImportBatchId") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    username: session.username
  });
  return { ok: true, workPhaseBaselineId: result.workPhaseBaselineId };
};

export const proposeCorrectionAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  const result = await proposeCorrection(services, {
    projectId: session.projectId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    itemCode: String(formData.get("itemCode") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    username: session.username
  });
  return { ok: true, correctionId: result.correctionId };
};

export const approveCorrectionPmAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  await approveCorrectionPm(services, {
    projectId: session.projectId,
    correctionId: String(formData.get("correctionId") ?? ""),
    comment: String(formData.get("comment") ?? "") || null,
    username: session.username
  });
  return { ok: true };
};

export const approveCorrectionFinalAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  const result = await approveCorrectionFinal(services, {
    projectId: session.projectId,
    correctionId: String(formData.get("correctionId") ?? ""),
    comment: String(formData.get("comment") ?? "") || null,
    username: session.username
  });
  return { ok: true, baselineId: result.baselineId };
};
