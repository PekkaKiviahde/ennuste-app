import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createBudgetStaging } from "@ennuste/application";
import { createServices } from "../../../../../server/services";
import { getSessionFromRequest } from "../../../../../server/session";
import { AppError } from "@ennuste/shared";

const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const DEFAULT_REPO_PATH = "test_budget.csv";
const ALLOWED_REPO_PATHS = new Set(
  (process.env.REPO_BUDGET_CSV_WHITELIST ??
    process.env.NEXT_PUBLIC_REPO_BUDGET_CSV_WHITELIST ??
    "test_budget.csv,data/samples/budget.csv")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Repo-CSV tuonti ei ole sallittu tuotannossa." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const importedBy = String(body.importedBy || "").trim() || session.username;
    const repoPath = String(body.repoPath || DEFAULT_REPO_PATH).trim() || DEFAULT_REPO_PATH;
    if (!ALLOWED_REPO_PATHS.has(repoPath)) {
      return NextResponse.json({ error: "Repo-polku ei ole sallittu." }, { status: 400 });
    }
    if (path.isAbsolute(repoPath)) {
      return NextResponse.json({ error: "Repo-polun tulee olla suhteellinen." }, { status: 400 });
    }
    const resolvedPath = path.resolve(REPO_ROOT, repoPath);
    if (!resolvedPath.startsWith(`${REPO_ROOT}${path.sep}`)) {
      return NextResponse.json({ error: "Repo-polku ei saa osoittaa repositorion ulkopuolelle." }, { status: 400 });
    }
    const csvText = await readFile(resolvedPath, "utf8");
    if (!csvText.trim()) {
      return NextResponse.json({ error: "Repo-CSV on tyhja." }, { status: 400 });
    }

    const services = createServices();
    const result = await createBudgetStaging(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      importedBy,
      fileName: path.basename(resolvedPath),
      csvText
    });

    return NextResponse.json({
      staging_batch_id: result.stagingBatchId,
      line_count: result.lineCount,
      issue_count: result.issueCount,
      repo_path: repoPath,
      warnings: result.warnings
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Repo-CSV tiedostoa ei loydy." }, { status: 404 });
    }
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
