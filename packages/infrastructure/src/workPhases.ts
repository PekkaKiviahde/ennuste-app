import type { WorkPhasePort } from "@ennuste/application";
import { pool, query } from "./db";

export const workPhaseRepository = (): WorkPhasePort => ({
  async listWorkPhases(projectId) {
    const result = await query(
      "SELECT work_phase_id, name, status, created_at FROM work_phases WHERE project_id = $1::uuid ORDER BY created_at DESC",
      [projectId]
    );
    return result.rows;
  },
  async createWeeklyUpdate(input) {
    const result = await query<{ work_phase_weekly_update_id: string }>(
      "INSERT INTO work_phase_weekly_updates (project_id, work_phase_id, week_ending, percent_complete, progress_notes, risks, created_by) VALUES ($1::uuid, $2::uuid, $3::date, $4, $5, $6, $7) RETURNING work_phase_weekly_update_id",
      [
        input.projectId,
        input.workPhaseId,
        input.weekEnding,
        input.percentComplete,
        input.progressNotes ?? null,
        input.risks ?? null,
        input.createdBy
      ]
    );
    return { workPhaseWeeklyUpdateId: result.rows[0].work_phase_weekly_update_id };
  },
  async createGhostEntry(input) {
    const result = await query<{ ghost_cost_entry_id: string }>(
      "INSERT INTO ghost_cost_entries (project_id, work_phase_id, week_ending, cost_type, amount, description, created_by) VALUES ($1::uuid, $2::uuid, $3::date, $4, $5, $6, $7) RETURNING ghost_cost_entry_id",
      [
        input.projectId,
        input.workPhaseId,
        input.weekEnding,
        input.costType,
        input.amount,
        input.description ?? null,
        input.createdBy
      ]
    );
    return { ghostCostEntryId: result.rows[0].ghost_cost_entry_id };
  },
  async lockBaseline(input) {
    const result = await pool.query<{ work_phase_lock_baseline_secure: string }>(
      "SELECT work_phase_lock_baseline_secure($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text) AS work_phase_lock_baseline_secure",
      [
        input.workPhaseId,
        input.workPhaseVersionId,
        input.targetImportBatchId,
        input.username,
        input.notes ?? null
      ]
    );
    return { workPhaseBaselineId: result.rows[0].work_phase_lock_baseline_secure };
  },
  async proposeCorrection(input) {
    const result = await query<{ work_phase_propose_add_littera_from_item_secure: string }>(
      "SELECT work_phase_propose_add_littera_from_item_secure($1::uuid, $2::text, $3::text, $4::text) AS work_phase_propose_add_littera_from_item_secure",
      [input.workPhaseId, input.itemCode, input.username, input.notes ?? null]
    );
    return { correctionId: result.rows[0].work_phase_propose_add_littera_from_item_secure };
  },
  async approveCorrectionPm(input) {
    await query(
      "SELECT work_phase_approve_correction_pm_secure($1::uuid, $2::text, $3::text)",
      [input.correctionId, input.username, input.comment ?? null]
    );
  },
  async approveCorrectionFinal(input) {
    const result = await query<{ work_phase_approve_correction_final_secure: string }>(
      "SELECT work_phase_approve_correction_final_secure($1::uuid, $2::text, $3::text) AS work_phase_approve_correction_final_secure",
      [input.correctionId, input.username, input.comment ?? null]
    );
    return { baselineId: result.rows[0].work_phase_approve_correction_final_secure };
  }
});
