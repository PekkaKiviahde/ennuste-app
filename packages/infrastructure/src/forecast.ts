import type { ForecastPort } from "@ennuste/application";
import { pool } from "./db";

export const forecastRepository = (): ForecastPort => ({
  async createForecastEvent(input) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
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

      await client.query("COMMIT");
      return { forecastEventId };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  async listForecastCurrent(projectId) {
    const result = await pool.query(
      "SELECT * FROM v_report_forecast_current WHERE project_id = $1::uuid ORDER BY event_time DESC",
      [projectId]
    );
    return result.rows;
  }
});
