import { Type } from "@google/genai";
import { generateStructured } from "../gemini-core";
import { FillReportResultSchema, type FillReportRequest, type FillReportResult } from "./types";
import { FILL_SYSTEM_PROMPT, buildFillPrompt } from "./prompt";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    filledReport: { type: Type.STRING },
    coverage: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["dolduruldu", "kısmen", "bilgi_yok"] },
          note: { type: Type.STRING },
        },
        required: ["section", "status", "note"],
        propertyOrdering: ["section", "status", "note"],
      },
    },
    followUps: { type: Type.ARRAY, items: { type: Type.STRING } },
    usedNotesSummary: { type: Type.STRING },
  },
  required: ["filledReport", "coverage", "followUps", "usedNotesSummary"],
  propertyOrdering: ["filledReport", "coverage", "followUps", "usedNotesSummary"],
} as const;

export async function fillReport(req: FillReportRequest): Promise<FillReportResult> {
  const parsed = await generateStructured({
    systemInstruction: FILL_SYSTEM_PROMPT,
    contents: buildFillPrompt(req),
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.2,
    maxOutputTokens: 16384,
  });

  const result = FillReportResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Model çıktısı beklenen şemaya uymuyor: " +
        result.error.issues.map((i) => `${i.path.join(".")} - ${i.message}`).join("; "),
    );
  }
  return result.data;
}
