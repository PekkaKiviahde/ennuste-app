import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "BASELINE_LOCK_NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
