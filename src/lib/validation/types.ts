/**
 * Otomatik Veri Doğrulama Modülü — tipler
 *
 * Analistin operasyonel süreçlerde incelediği ham veri / SQL çıktısını,
 * tanımlı bir şemaya (kolon kuralları) göre doğrular. Format uyuşmazlıkları,
 * eksik zorunlu alanlar, geçersiz tarih/sayı formatları vb. tespit edilir.
 */

export type FieldType =
  | "text"
  | "integer"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "boolean"
  | "email"
  | "iban"
  | "tckn"
  | "phone";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Metin",
  integer: "Tam sayı",
  number: "Sayı",
  money: "Tutar",
  date: "Tarih",
  datetime: "Tarih-saat",
  boolean: "Boolean",
  email: "E-posta",
  iban: "IBAN",
  tckn: "TCKN",
  phone: "Telefon",
};

export type DateFormat = "auto" | "iso" | "dd.mm.yyyy" | "dd/mm/yyyy";

export interface FieldRule {
  /** Kolon başlığı (veri ile eşleşir) */
  column: string;
  type?: FieldType;
  /** NULL / boş / placeholder değere izin yok */
  required?: boolean;
  /** Kolon içinde tekrar eden değere izin yok */
  unique?: boolean;
  /** number/money: değer; text: karakter uzunluğu; date: ISO alt sınır */
  min?: number | string;
  max?: number | string;
  /** Regex (kaynak metin, bayraksız) */
  pattern?: string;
  /** İzinli değer listesi */
  allowed?: string[];
  /** allowed / pattern büyük-küçük harf duyarsız çalışsın */
  ignoreCase?: boolean;
  dateFormat?: DateFormat;
  notFuture?: boolean;
  notPast?: boolean;
}

export interface Schema {
  name?: string;
  fields: FieldRule[];
}

export type IssueCode =
  | "required-missing"
  | "type-mismatch"
  | "format-invalid"
  | "out-of-range"
  | "too-short"
  | "too-long"
  | "pattern-mismatch"
  | "not-allowed"
  | "duplicate"
  | "future-date"
  | "past-date"
  | "error-token"
  | "inconsistent-type"
  | "unknown-column";

export const ISSUE_LABELS: Record<IssueCode, string> = {
  "required-missing": "Zorunlu alan boş",
  "type-mismatch": "Tip uyuşmuyor",
  "format-invalid": "Geçersiz format",
  "out-of-range": "Aralık dışı",
  "too-short": "Çok kısa",
  "too-long": "Çok uzun",
  "pattern-mismatch": "Desene uymuyor",
  "not-allowed": "İzinli değil",
  duplicate: "Tekrar eden değer",
  "future-date": "Gelecek tarih",
  "past-date": "Geçmiş tarih",
  "error-token": "Hata işaretçisi",
  "inconsistent-type": "Kolon içi tutarsız tip",
  "unknown-column": "Şemada olmayan kolon",
};

export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  /** 0-index veri satırı; -1 = kolon/tablo seviyesi bulgu */
  row: number;
  column: string;
  columnIndex: number;
  value: string;
  code: IssueCode;
  severity: Severity;
  message: string;
  /** Analiste "şöyle olmalıydı" önerisi (auto-fix uygulanmaz, sadece gösterilir) */
  suggestion?: string;
}

export interface ColumnSummary {
  column: string;
  index: number;
  inferredType: FieldType | "empty" | "mixed";
  ruleType?: FieldType;
  total: number;
  nulls: number;
  distinct: number;
  issues: number;
}

export interface ValidationReport {
  rowCount: number;
  columnCount: number;
  emptyResult: boolean;
  /** Kullanılan efektif şema (çıkarım + kullanıcı düzenlemeleri) */
  schema: Schema;
  columns: ColumnSummary[];
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    affectedRows: number;
    cleanRows: number;
  };
}
