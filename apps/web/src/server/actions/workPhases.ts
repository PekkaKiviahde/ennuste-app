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
  await createWeeklyUpdate(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    weekEnding: String(formData.get("weekEnding") ?? ""),
    percentComplete: Number(formData.get("percentComplete") ?? 0),
    progressNotes: String(formData.get("progressNotes") ?? "") || null,
    risks: String(formData.get("risks") ?? "") || null,
    username: session.username
  });
};

export const createGhostEntryAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  await createGhostEntry(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    weekEnding: String(formData.get("weekEnding") ?? ""),
    costType: String(formData.get("costType") ?? "LABOR") as "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER",
    amount: Number(formData.get("amount") ?? 0),
    description: String(formData.get("description") ?? "") || null,
    username: session.username
  });
};

export const lockBaselineAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  await lockBaseline(services, {
    projectId: session.projectId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    workPhaseVersionId: String(formData.get("workPhaseVersionId") ?? ""),
    targetImportBatchId: String(formData.get("targetImportBatchId") ?? ""),
    tenantId: session.tenantId,
    notes: String(formData.get("notes") ?? "") || null,
    username: session.username
  });
};

export const proposeCorrectionAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  await proposeCorrection(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    workPhaseId: String(formData.get("workPhaseId") ?? ""),
    itemCode: String(formData.get("itemCode") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    username: session.username
  });
};

export const approveCorrectionPmAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  await approveCorrectionPm(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    correctionId: String(formData.get("correctionId") ?? ""),
    comment: String(formData.get("comment") ?? "") || null,
    username: session.username
  });
};

export const approveCorrectionFinalAction = async (formData: FormData) => {
  const session = requireSession();
  const services = createServices();
  await approveCorrectionFinal(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    correctionId: String(formData.get("correctionId") ?? ""),
    comment: String(formData.get("comment") ?? "") || null,
    username: session.username
  });
};
