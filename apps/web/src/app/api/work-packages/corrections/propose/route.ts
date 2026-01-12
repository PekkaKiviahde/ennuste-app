import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "CORRECTION_NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
