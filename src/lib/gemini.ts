import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResultSchema, type AnalysisResult, type GenerateRequest } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

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

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY tanımlı değil. Proje kökünde .env.local dosyası oluşturun (.env.example örneğine bakın).",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 503 (yoğunluk) / 429 (rate limit) durumlarında kısa üstel bekleme ile tekrar dener. */
async function generateWithRetry(ai: GoogleGenAI, prompt: string, retries = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          responseSchema: RESPONSE_SCHEMA as any,
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      const retriable = status === 503 || status === 429 || status === 500;
      if (retriable && attempt >= retries) {
        throw new Error(
          "Gemini şu an yoğun (503/429). Birkaç kez denendi, sonuç alınamadı — lütfen biraz sonra tekrar deneyin.",
        );
      }
      if (!retriable) throw err;
      await sleep(800 * 2 ** attempt);
    }
  }
}

export async function generateAnalysis(req: GenerateRequest): Promise<AnalysisResult> {
  const ai = getClient();

  const res = await generateWithRetry(ai, buildUserPrompt(req));

  const text = res.text;
  if (!text) throw new Error("Model boş yanıt döndürdü. Lütfen tekrar deneyin.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model geçersiz JSON döndürdü.");
  }

  const result = AnalysisResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      "Model çıktısı beklenen şemaya uymuyor: " +
        result.error.issues.map((i) => `${i.path.join(".")} - ${i.message}`).join("; "),
    );
  }
  return result.data;
}
