import { z } from "zod";

/**
 * ReqToStory - AI çıktısının tek doğruluk kaynağı (single source of truth).
 * Hem API route validasyonunda hem de UI tipi olarak kullanılır.
 */

export const PROJECT_TYPES = ["Web", "Mobil", "API", "Finans/Portföy"] as const;
export const AUDIENCE_ROLES = [
  "Müşteri",
  "Portföy Yöneticisi",
  "Sistem Yöneticisi",
  "Operasyon Ekibi",
  "Geliştirici",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type AudienceRole = (typeof AUDIENCE_ROLES)[number];

/** Given-When-Then (Gherkin) senaryosu */
export const GherkinScenarioSchema = z.object({
  name: z.string().min(1).describe("Senaryo başlığı, örn: 'Fon alım talebini iptal etme'"),
  given: z.array(z.string().min(1)).min(1).describe("Ön koşullar"),
  when: z.array(z.string().min(1)).min(1).describe("Tetikleyen aksiyon(lar)"),
  then: z.array(z.string().min(1)).min(1).describe("Beklenen sonuç(lar)"),
});
export type GherkinScenario = z.infer<typeof GherkinScenarioSchema>;

export const UserStorySchema = z.object({
  id: z.string().min(1).describe("Kısa slug, örn: 'US-01'"),
  title: z.string().min(1),
  priority: z.enum(["Yüksek", "Orta", "Düşük"]),
  role: z.string().min(1).describe("As a [Rol]"),
  feature: z.string().min(1).describe("I want [Özellik]"),
  benefit: z.string().min(1).describe("So that [İş Değeri]"),
  acceptanceCriteria: z.array(GherkinScenarioSchema).min(1),
  edgeCases: z.array(z.string().min(1)).describe("Negatif / istisnai durumlar, hata, limit, güvenlik"),
  businessRules: z.array(z.string().min(1)).describe("Validasyonlar, veri tipi kontrolleri, iş kuralları"),
});
export type UserStory = z.infer<typeof UserStorySchema>;

export const AnalysisResultSchema = z.object({
  title: z.string().min(1).describe("Tüm talebi özetleyen kısa başlık"),
  summary: z.string().min(1).describe("2-4 cümlelik yönetici özeti"),
  assumptions: z.array(z.string().min(1)).describe("Metinde net olmayan, varsayılan noktalar"),
  openQuestions: z.array(z.string().min(1)).describe("Analistin müşteriye sorması gereken sorular"),
  stories: z.array(UserStorySchema).min(1),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

export const GenerateRequestSchema = z.object({
  rawText: z
    .string()
    .trim()
    .min(20, "Lütfen en az 20 karakterlik anlamlı bir gereksinim metni girin.")
    .max(12000, "Metin çok uzun (maksimum 12.000 karakter)."),
  projectType: z.enum(PROJECT_TYPES).optional(),
  audienceRole: z.enum(AUDIENCE_ROLES).optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export type GenerateResponse =
  | { ok: true; data: AnalysisResult }
  | { ok: false; error: string };
