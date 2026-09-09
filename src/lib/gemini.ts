import { Type } from "@google/genai";
import { generateStructured } from "./gemini-core";
import { AnalysisResultSchema, type AnalysisResult, type GenerateRequest } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

/** Gemini responseSchema (OpenAPI alt kümesi). Zod şeması ile birebir uyumlu tutulmalı. */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    openQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    stories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["Yüksek", "Orta", "Düşük"] },
          role: { type: Type.STRING },
          feature: { type: Type.STRING },
          benefit: { type: Type.STRING },
          acceptanceCriteria: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                given: { type: Type.ARRAY, items: { type: Type.STRING } },
                when: { type: Type.ARRAY, items: { type: Type.STRING } },
                then: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["name", "given", "when", "then"],
              propertyOrdering: ["name", "given", "when", "then"],
            },
          },
          edgeCases: { type: Type.ARRAY, items: { type: Type.STRING } },
          businessRules: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          "id",
          "title",
          "priority",
          "role",
          "feature",
          "benefit",
          "acceptanceCriteria",
          "edgeCases",
          "businessRules",
        ],
        propertyOrdering: [
          "id",
          "title",
          "priority",
          "role",
          "feature",
          "benefit",
          "acceptanceCriteria",
          "edgeCases",
          "businessRules",
        ],
      },
    },
  },
  required: ["title", "summary", "assumptions", "openQuestions", "stories"],
  propertyOrdering: ["title", "summary", "assumptions", "openQuestions", "stories"],
} as const;

export async function generateAnalysis(req: GenerateRequest): Promise<AnalysisResult> {
  const parsed = await generateStructured({
    systemInstruction: SYSTEM_PROMPT,
    contents: buildUserPrompt(req),
    responseSchema: RESPONSE_SCHEMA,
  });

  const result = AnalysisResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Model çıktısı beklenen şemaya uymuyor: " +
        result.error.issues.map((i) => `${i.path.join(".")} - ${i.message}`).join("; "),
    );
  }
  return result.data;
}
