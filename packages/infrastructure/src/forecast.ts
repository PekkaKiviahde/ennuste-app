import type { ForecastPort } from "@ennuste/application";
import { dbForTenant } from "./db";

export const forecastRepository = (): ForecastPort => ({
  async createForecastEvent(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    return tenantDb.transaction(async (client) => {
      const eventResult = await client.query<{ forecast_event_id: string }>(
        `
          INSERT INTO forecast_events (
            project_id,
            target_littera_id,
            mapping_version_id,
            source,
            comment,
            technical_progress,
            financial_progress,
            kpi_value,
            created_by
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'UI', $4, $5, $6, $7, $8)
          RETURNING forecast_event_id
        `,
        [
          input.projectId,
          input.targetLitteraId,
          input.mappingVersionId ?? null,
          input.comment ?? null,
          input.technicalProgress ?? null,
          input.financialProgress ?? null,
          input.kpiValue ?? null,
          input.createdBy
        ]
      );

      const forecastEventId = eventResult.rows[0].forecast_event_id;

      for (const line of input.lines) {
        await client.query(
          `
            INSERT INTO forecast_event_lines (
              forecast_event_id,
              cost_type,
              forecast_value,
              memo_general,
              memo_procurement,
              memo_calculation
            ) VALUES ($1::uuid, $2::cost_type, $3, $4, $5, $6)
          `,
          [
            forecastEventId,
            line.costType,
            line.forecastValue,
            line.memoGeneral ?? null,
            line.memoProcurement ?? null,
            line.memoCalculation ?? null
          ]
        );
      }

      return { forecastEventId };
    });
  },
  async listForecastCurrent(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT * FROM v_report_forecast_current WHERE project_id = $1::uuid ORDER BY event_time DESC",
      [projectId]
    );
    return result.rows;
  },
  async getForecastSnapshot(projectId, tenantId, targetLitteraId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const eventResult = await tenantDb.query<{
      forecast_event_id: string;
      mapping_version_id: string | null;
      comment: string | null;
      technical_progress: number | null;
      financial_progress: number | null;
      kpi_value: number | null;
    }>(
      "SELECT forecast_event_id, mapping_version_id, comment, technical_progress, financial_progress, kpi_value FROM v_forecast_current WHERE project_id = $1::uuid AND target_littera_id = $2::uuid",
      [projectId, targetLitteraId]
    );
    const event = eventResult.rows[0] ?? null;
    const linesResult = await tenantDb.query<{
      cost_type: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
      forecast_value: number;
      memo_general: string | null;
      memo_procurement: string | null;
      memo_calculation: string | null;
    }>(
      "SELECT cost_type, forecast_value, memo_general, memo_procurement, memo_calculation FROM v_forecast_current_lines WHERE project_id = $1::uuid AND target_littera_id = $2::uuid",
      [projectId, targetLitteraId]
    );
    return { event, lines: linesResult.rows };
  }
});
