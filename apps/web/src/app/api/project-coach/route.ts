import "server-only";
import { NextResponse } from "next/server";
import { runProjectCoach } from "../../../agents/projectCoach";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Opt-in AI: /api/project-coach?ai=1
  const useAI = url.searchParams.get("ai") === "1";

  // Optional input: /api/project-coach?ai=1&q=...
  const question = url.searchParams.get("q") ?? undefined;

  const { message, aiUsed } = await runProjectCoach({ useAI, question });

  return NextResponse.json({ message, aiUsed });
}
