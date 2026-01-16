import { NextResponse } from "next/server";
import { consumeBillingWebhook } from "@ennuste/application";
import { createServices } from "../../../../../server/services";
import { AppError } from "@ennuste/shared";

export async function POST(
  request: Request,
  context: { params: { provider: string } }
) {
  try {
    const rawBody = new Uint8Array(await request.arrayBuffer());
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const services = createServices();
    const result = await consumeBillingWebhook(services, {
      provider: context.params.provider,
      rawBody,
      headers
    });

    if (result.outcome === "REJECTED") {
      return NextResponse.json({ error: result.message || "Webhook hylättiin." }, { status: result.httpStatus });
    }
    return new NextResponse(null, { status: result.httpStatus });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
