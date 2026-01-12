import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "GHOST_ENTRY_NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
