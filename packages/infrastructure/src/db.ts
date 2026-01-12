/// <reference path="./pg.d.ts" />
import { Pool } from "pg";
import { ForbiddenError } from "@ennuste/shared";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set; database calls will fail.");
}

export const pool = new Pool({
  connectionString
});

export const query = async <T>(text: string, params: unknown[] = []) => {
  const result = await pool.query<T>(text, params);
  return result;
};

export const withTransaction = async <T>(fn: (client: Pool) => Promise<T>) => {
  return fn(pool);
};

export type TenantDb = {
  tenantId: string;
  query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;
  requireProject: (projectId: string) => Promise<void>;
  getProjectContext: (projectId: string) => Promise<{ organizationId: string }>;
  requireWorkPackage: (workPackageId: string) => Promise<void>;
  requireCorrection: (correctionId: string) => Promise<void>;
  transaction: <T>(fn: (client: { query: <Q>(text: string, params?: unknown[]) => Promise<{ rows: Q[]; rowCount: number }> }) => Promise<T>) => Promise<T>;
};

export const dbForTenant = (tenantId: string): TenantDb => {
  if (!tenantId) {
    throw new Error("tenant_id puuttuu");
  }

  const tenantQuery = async <T>(text: string, params: unknown[] = []) => {
    const result = await pool.query<T>(text, params);
    return result;
  };

  const requireProject = async (projectId: string) => {
    const result = await tenantQuery(
      "SELECT 1 FROM projects WHERE project_id = $1::uuid AND tenant_id = $2::uuid",
      [projectId, tenantId]
    );
    if (result.rowCount === 0) {
      throw new ForbiddenError("Projektia ei loytynyt tenantista");
    }
  };

  const getProjectContext = async (projectId: string) => {
    const result = await tenantQuery<{ organization_id: string }>(
      "SELECT organization_id FROM projects WHERE project_id = $1::uuid AND tenant_id = $2::uuid",
      [projectId, tenantId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new ForbiddenError("Projektia ei loytynyt tenantista");
    }
    return { organizationId: row.organization_id };
  };

  const requireWorkPackage = async (workPackageId: string) => {
    const result = await tenantQuery(
      "SELECT 1 FROM work_packages wp JOIN projects p ON p.project_id = wp.project_id WHERE wp.id = $1::uuid AND p.tenant_id = $2::uuid",
      [workPackageId, tenantId]
    );
    if (result.rowCount === 0) {
      throw new ForbiddenError("Tyopaketti ei kuulu tenanttiin");
    }
  };

  const requireCorrection = async (correctionId: string) => {
    const result = await tenantQuery(
      "SELECT 1 FROM work_phase_corrections c JOIN projects p ON p.project_id = c.project_id WHERE c.correction_id = $1::uuid AND p.tenant_id = $2::uuid",
      [correctionId, tenantId]
    );
    if (result.rowCount === 0) {
      throw new ForbiddenError("Korjaus ei kuulu tenanttiin");
    }
  };

  const transaction = async <T>(
    fn: (client: { query: <Q>(text: string, params?: unknown[]) => Promise<{ rows: Q[]; rowCount: number }> }) => Promise<T>
  ) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    tenantId,
    query: tenantQuery,
    requireProject,
    getProjectContext,
    requireWorkPackage,
    requireCorrection,
    transaction
  };
};
