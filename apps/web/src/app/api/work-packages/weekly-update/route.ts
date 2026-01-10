import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "WEEKLY_UPDATE_NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
