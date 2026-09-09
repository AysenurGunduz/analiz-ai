import { NextResponse } from "next/server";
import { FillReportRequestSchema, type FillReportResponse } from "@/lib/report/types";
import { fillReport } from "@/lib/report/fill";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request): Promise<NextResponse<FillReportResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = FillReportRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ");
    return NextResponse.json({ ok: false, error: msg }, { status: 422 });
  }

  try {
    const data = await fillReport(parsed.data);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
    console.error("[/api/fill-report]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
