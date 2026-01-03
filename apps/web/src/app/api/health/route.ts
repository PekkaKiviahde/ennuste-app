import { NextResponse } from "next/server";
import { assertDemoModeSafe } from "../../../server/env";

export async function GET() {
  try {
    assertDemoModeSafe();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terveystarkistus epaonnistui";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
