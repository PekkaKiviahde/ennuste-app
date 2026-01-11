import OpenAI from "openai";

export function createOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  return new OpenAI({ apiKey: key });
}

export async function callModelText(openai: OpenAI, model: string, prompt: string): Promise<string> {
  try {
    const resp = await openai.responses.create({
      model,
      input: prompt,
    });
    return String(resp.output_text ?? "").trim();
  } catch {
    const resp = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });
    const text = resp?.choices?.[0]?.message?.content ?? "";
    return String(text).trim();
  }
}
