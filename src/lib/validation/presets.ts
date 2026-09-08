import type { FieldRule } from "./types";

export interface Preset {
  id: string;
  label: string;
  description: string;
  rule: Omit<FieldRule, "column">;
}

/** Tek tıkla uygulanan hazır kural setleri. */
export const PRESETS: Preset[] = [
  {
    id: "tckn",
    label: "TCKN",
    description: "11 hane + kontrol hanesi doğrulaması, zorunlu, benzersiz",
    rule: { type: "tckn", required: true, unique: true },
  },
  {
    id: "iban",
    label: "IBAN",
    description: "Ülke kodu + mod-97 kontrolü",
    rule: { type: "iban", required: true },
  },
  {
    id: "email",
    label: "E-posta",
    description: "user@domain.tld biçimi",
    rule: { type: "email" },
  },
  {
    id: "phone",
    label: "Telefon (TR)",
    description: "+90 5xx xxx xx xx / 05xx... normalize edilir",
    rule: { type: "phone" },
  },
  {
    id: "money-positive",
    label: "Tutar (≥ 0)",
    description: "Sayısal, negatif olamaz, 2 ondalık",
    rule: { type: "money", min: 0 },
  },
  {
    id: "iso-date-past",
    label: "ISO tarih (geçmiş)",
    description: "YYYY-MM-DD, gelecekte olamaz",
    rule: { type: "date", dateFormat: "iso", notFuture: true },
  },
  {
    id: "id-key",
    label: "Kimlik/Anahtar",
    description: "Zorunlu ve benzersiz tam sayı",
    rule: { type: "integer", required: true, unique: true },
  },
  {
    id: "status-enum",
    label: "Durum (enum)",
    description: "İzinli değer listesi — sonra düzenleyin",
    rule: { allowed: ["AKTIF", "PASIF", "BEKLEMEDE"], ignoreCase: true },
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
