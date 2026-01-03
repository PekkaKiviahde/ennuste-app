import { NextResponse } from "next/server";
import { checkHealth } from "@ennuste/application";
import { assertDemoModeSafe } from "../../../server/env";
import { createServices } from "../../../server/services";

export async function GET() {
  try {
    assertDemoModeSafe();
    const services = createServices();
    const result = await checkHealth(services);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terveystarkistus epaonnistui";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
