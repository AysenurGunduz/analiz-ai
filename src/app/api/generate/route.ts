import { NextResponse } from "next/server";
import { GenerateRequestSchema, type GenerateResponse } from "@/lib/types";
import { generateAnalysis } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse<GenerateResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ");
    return NextResponse.json({ ok: false, error: msg }, { status: 422 });
  }

  try {
    const data = await generateAnalysis(parsed.data);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
    console.error("[/api/generate]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
