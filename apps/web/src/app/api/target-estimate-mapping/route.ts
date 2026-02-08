import { NextResponse } from "next/server";
import { assignTargetEstimateMappings, loadTargetEstimateMapping } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { getSessionFromRequest } from "../../../server/session";
import { AppError } from "@ennuste/shared";

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const services = createServices();
    const result = await loadTargetEstimateMapping(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const body = await request.json();
    const itemIds = Array.isArray(body?.itemIds) ? body.itemIds.map(String) : [];
    if (itemIds.length === 0) {
      return NextResponse.json({ error: "Paivitettavat rivit puuttuvat" }, { status: 400 });
    }

    const hasWorkPackage = hasOwn(body, "workPackageId");
    const hasProcPackage = hasOwn(body, "procPackageId");

    if (!hasWorkPackage && !hasProcPackage) {
      return NextResponse.json({ error: "Paivitystiedot puuttuvat" }, { status: 400 });
    }

    const normalizedWorkPackageId = hasWorkPackage
      ? String(body.workPackageId ?? "").trim() || null
      : undefined;
    const normalizedProcPackageId = hasProcPackage
      ? String(body.procPackageId ?? "").trim() || null
      : undefined;

    const updates = itemIds.map((targetEstimateItemId: string) => ({
      targetEstimateItemId,
      ...(hasWorkPackage ? { workPackageId: normalizedWorkPackageId } : {}),
      ...(hasProcPackage ? { procPackageId: normalizedProcPackageId } : {})
    }));

    const services = createServices();
    const result = await assignTargetEstimateMappings(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      updates
    });

    return NextResponse.json({ updatedCount: result.updatedCount });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details ?? null },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
