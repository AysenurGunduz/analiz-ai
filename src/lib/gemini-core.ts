import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
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

export interface StructuredCall {
  systemInstruction: string;
  contents: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema: any;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * responseSchema ile yapısal JSON üretir. 503/429/500'de üstel bekleme ile 3 kez
 * dener; JSON parse edilir. Şema doğrulaması çağırana bırakılır.
 */
export async function generateStructured(call: StructuredCall, retries = 3): Promise<unknown> {
  const ai = getGeminiClient();

  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: call.contents,
        config: {
          systemInstruction: call.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: call.responseSchema,
          temperature: call.temperature ?? 0.3,
          maxOutputTokens: call.maxOutputTokens ?? 8192,
        },
      });
      break;
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

  const text = res.text;
  if (!text) throw new Error("Model boş yanıt döndürdü. Lütfen tekrar deneyin.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Model geçersiz JSON döndürdü.");
  }
}
