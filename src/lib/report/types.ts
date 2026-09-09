import { z } from "zod";
import { PROJECT_TYPES, AUDIENCE_ROLES } from "../types";

/**
 * Rapor Şablonu Doldurma
 * ----------------------
 * Kullanıcı bir rapor şablonu (markdown / .docx'ten dönüştürülmüş) + toplantı
 * notlarını verir. Model, şablonun yapısını koruyarak boş alanları ve
 * {{placeholder}}'ları notlara göre doldurur.
 */

export const CoverageStatus = ["dolduruldu", "kısmen", "bilgi_yok"] as const;
export type CoverageStatus = (typeof CoverageStatus)[number];

export const CoverageItemSchema = z.object({
  section: z.string().min(1).describe("Şablondaki bölüm / alan başlığı"),
  status: z.enum(CoverageStatus),
  note: z.string().describe("Kısa açıklama: neye göre dolduruldu / hangi bilgi eksik"),
});
export type CoverageItem = z.infer<typeof CoverageItemSchema>;

export const FillReportResultSchema = z.object({
  filledReport: z
    .string()
    .min(1)
    .describe(
      "Şablonun aynısı, yapısı (başlıklar, sıra, tablolar) korunmuş, boş alanlar ve " +
        "{{placeholder}}'lar notlara göre doldurulmuş markdown metin.",
    ),
  coverage: z.array(CoverageItemSchema).describe("Bölüm bazında doldurma durumu"),
  followUps: z
    .array(z.string().min(1))
    .describe("Raporu tamamlamak için müşteriye / ekibe sorulması gereken sorular"),
  usedNotesSummary: z
    .string()
    .describe("Notlardan hangi bilgilerin kullanıldığına dair 1-2 cümlelik özet"),
});
export type FillReportResult = z.infer<typeof FillReportResultSchema>;

export const FillReportRequestSchema = z.object({
  template: z
    .string()
    .trim()
    .min(10, "Rapor şablonu çok kısa. En az bir başlık / alan içeren bir şablon girin.")
    .max(40000, "Şablon çok uzun (maksimum 40.000 karakter)."),
  notes: z
    .string()
    .trim()
    .min(20, "Toplantı notları çok kısa. En az 20 karakterlik anlamlı bir metin girin.")
    .max(60000, "Notlar çok uzun (maksimum 60.000 karakter)."),
  projectType: z.enum(PROJECT_TYPES).optional(),
  audienceRole: z.enum(AUDIENCE_ROLES).optional(),
});
export type FillReportRequest = z.infer<typeof FillReportRequestSchema>;

export type FillReportResponse =
  | { ok: true; data: FillReportResult }
  | { ok: false; error: string };
