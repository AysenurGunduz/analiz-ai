/**
 * Sorgu Çıktısı Ayrıştırıcı & Kontrolcü
 * ------------------------------------
 * Analistlerin SQL client'tan kopyaladığı tablo çıktısını (CSV/TSV) ve opsiyonel
 * olarak sorgunun kendisini alır; boş sonuç kümesi, NULL/boş hücre, tip/format
 * tutarsızlığı ve hata işaretçilerini tespit edip analiste rapor üretir.
 *
 * Tamamen istemci tarafında, saf fonksiyon — API çağrısı yok.
 */

export type Severity = "error" | "warning" | "info";

export type FlagKind =
  | "empty" // boş sonuç kümesi
  | "null" // NULL / boş hücre
  | "error-token" // #REF!, ORA-00933, ERROR ...
  | "type" // kolon tipine uymayan değer
  | "format" // bozuk tarih / sayı formatı
  | "negative" // tutar gibi kolonda negatif değer
  | "duplicate"; // anahtar gibi kolonda tekrar

export interface CellFlag {
  row: number; // 0-index (veri satırı, başlık hariç)
  col: number;
  value: string;
  kind: FlagKind;
  severity: Severity;
  message: string;
}

export type ColumnType =
  | "integer"
  | "number"
  | "date"
  | "boolean"
  | "text"
  | "empty"
  | "mixed";

export interface ColumnStat {
  name: string;
  index: number;
  type: ColumnType;
  /** type === "mixed" ise çoğunluğun somut tipi */
  dominant?: ColumnType;
  nullCount: number;
  distinctCount: number;
  looksLikeKey: boolean;
  looksLikeAmount: boolean;
}

export interface SqlWarning {
  severity: Severity;
  message: string;
}

export interface ParsedTable {
  delimiter: "," | ";" | "\t" | "|";
  headers: string[];
  rows: string[][];
}

export interface QueryCheckReport {
  table: ParsedTable;
  rowCount: number;
  colCount: number;
  emptyResult: boolean;
  columns: ColumnStat[];
  flags: CellFlag[];
  sqlWarnings: SqlWarning[];
  summary: {
    errors: number;
    warnings: number;
    affectedRows: number;
    affectedCells: number;
  };
}

/* ------------------------------------------------------------------ */
/* Sabitler                                                            */
/* ------------------------------------------------------------------ */

const NULL_TOKENS = new Set(
  ["", "null", "(null)", "nil", "none", "n/a", "na", "-", "—", "undefined", "boş"].map((s) =>
    s.toLowerCase(),
  ),
);

const ERROR_PATTERNS: RegExp[] = [
  /^#(ref|n\/a|value|div\/0|name|num|null)[!?]?$/i,
  /\bORA-\d{3,5}\b/i,
  /\b(SQLSTATE|ExecuteReader|Traceback|Exception|Fatal error)\b/i,
  /^(err!?|error|#error)$/i,
  /\b(NaN|Infinity|-Infinity)\b/,
];

const DATE_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/, // ISO
  /^\d{2}[./]\d{2}[./]\d{4}([ ]\d{2}:\d{2}(:\d{2})?)?$/, // dd.mm.yyyy / dd/mm/yyyy
];

const BOOL_TRUE = new Set(["true", "1", "evet", "e", "yes", "y", "t"]);
const BOOL_FALSE = new Set(["false", "0", "hayır", "hayir", "h", "no", "n", "f"]);

const KEY_NAME = /(^|[_\s])(id|no|kod|code|key|tckn|vkn|iban|uuid|guid|ref)([_\s]|$)/i;
const AMOUNT_NAME =
  /(tutar|bakiye|fiyat|price|amount|balance|miktar|adet|hacim|volume|komisyon|maliyet|nav|deger|değer)/i;

/* ------------------------------------------------------------------ */
/* Ayrıştırma (parser)                                                 */
/* ------------------------------------------------------------------ */

export function detectDelimiter(text: string): ParsedTable["delimiter"] {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts: Array<[ParsedTable["delimiter"], number]> = [
    ["\t", (firstLine.match(/\t/g) ?? []).length],
    [";", (firstLine.match(/;/g) ?? []).length],
    ["|", (firstLine.match(/\|/g) ?? []).length],
    [",", (firstLine.match(/,/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

/** Tek satırı, çift tırnak ("" ile kaçış) destekleyerek alanlara böler. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseDelimited(text: string, forced?: ParsedTable["delimiter"]): ParsedTable {
  const delimiter = forced ?? detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { delimiter, headers: [], rows: [] };

  const headers = splitLine(lines[0], delimiter).map((h, i) => h || `kolon_${i + 1}`);
  const rows = lines.slice(1).map((l) => {
    const cells = splitLine(l, delimiter);
    // başlık sayısına hizala
    while (cells.length < headers.length) cells.push("");
    return cells.slice(0, headers.length);
  });
  return { delimiter, headers, rows };
}

/* ------------------------------------------------------------------ */
/* Değer sınıflandırma                                                 */
/* ------------------------------------------------------------------ */

export function isNullLike(v: string): boolean {
  return NULL_TOKENS.has(v.trim().toLowerCase());
}

export function isErrorToken(v: string): boolean {
  const t = v.trim();
  return ERROR_PATTERNS.some((re) => re.test(t));
}

function normalizeNumber(v: string): string {
  // "1.234,56" (TR) veya "1,234.56" (EN) → "1234.56"
  let s = v.trim().replace(/\s/g, "").replace(/₺|tl|try|\$|€/gi, "");
  if (/,\d{1,2}$/.test(s) && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,2}$/.test(s) && s.includes(",")) s = s.replace(/,/g, "");
  else s = s.replace(/,/g, "");
  return s;
}

export function parseNumeric(v: string): number | null {
  const s = normalizeNumber(v);
  if (s === "" || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isInteger(v: string): boolean {
  const n = parseNumeric(v);
  return n !== null && Number.isInteger(n);
}

function isDate(v: string): boolean {
  return DATE_PATTERNS.some((re) => re.test(v.trim()));
}

/** Tarih "gibi görünen" (rakam + ayraç) ama formatı tutmayan değer. */
function looksDateish(v: string): boolean {
  return /^\d{1,4}[-./]\d{1,2}[-./]\d{1,4}/.test(v.trim());
}

function isBoolean(v: string): boolean {
  const t = v.trim().toLowerCase();
  return BOOL_TRUE.has(t) || BOOL_FALSE.has(t);
}

/** Bir değerin belirli bir somut tipe uyup uymadığı. */
function matchesType(v: string, type: ColumnType): boolean {
  switch (type) {
    case "boolean":
      return isBoolean(v);
    case "integer":
      return isInteger(v);
    case "number":
      return parseNumeric(v) !== null;
    case "date":
      return isDate(v);
    case "text":
      return true;
    default:
      return true;
  }
}

/** "mixed" bir kolonda çoğunluğun hangi somut tip olduğunu bulur. */
function dominantConcreteType(values: string[]): ColumnType {
  const nonNull = values.filter((v) => !isNullLike(v) && !isErrorToken(v));
  const tally: Record<string, number> = { boolean: 0, integer: 0, number: 0, date: 0, text: 0 };
  for (const v of nonNull) {
    if (isBoolean(v)) tally.boolean++;
    else if (isInteger(v)) tally.integer++;
    else if (parseNumeric(v) !== null) tally.number++;
    else if (isDate(v)) tally.date++;
    else tally.text++;
  }
  // number, integer'ı da kapsar
  tally.number += tally.integer;
  const winner = (Object.entries(tally) as Array<[ColumnType, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return winner && winner[1] > 0 ? winner[0] : "text";
}

function inferColumnType(values: string[]): ColumnType {
  const nonNull = values.filter((v) => !isNullLike(v) && !isErrorToken(v));
  if (nonNull.length === 0) return "empty";

  const all = (fn: (v: string) => boolean) => nonNull.every(fn);
  const some = (fn: (v: string) => boolean) => nonNull.some(fn);

  if (all(isBoolean)) return "boolean";
  if (all(isInteger)) return "integer";
  if (all((v) => parseNumeric(v) !== null)) return "number";
  if (all(isDate)) return "date";

  const numericShare =
    nonNull.filter((v) => parseNumeric(v) !== null).length / nonNull.length;
  if (numericShare > 0 && numericShare < 1) return "mixed";
  if (some(isDate) && !all(isDate)) return "mixed";
  return "text";
}

/* ------------------------------------------------------------------ */
/* SQL basit kontrolleri                                               */
/* ------------------------------------------------------------------ */

export function checkSql(sqlRaw: string): SqlWarning[] {
  const sql = sqlRaw.trim();
  if (!sql) return [];
  const w: SqlWarning[] = [];
  const lower = sql.toLowerCase();
  const noStrings = lower.replace(/'[^']*'/g, "''");

  if (/=\s*null|!=\s*null|<>\s*null/.test(noStrings)) {
    w.push({
      severity: "error",
      message: "NULL karşılaştırması: `= NULL` yerine `IS NULL` / `IS NOT NULL` kullanın.",
    });
  }
  if (/\bselect\s+\*/.test(noStrings)) {
    w.push({
      severity: "warning",
      message: "`SELECT *` — ihtiyaç duyulan kolonları açıkça listeleyin.",
    });
  }
  if (
    /\bselect\b/.test(noStrings) &&
    !/\bwhere\b/.test(noStrings) &&
    !/\blimit\b|\bfetch\s+first\b|\btop\s+\d/.test(noStrings) &&
    !/\bcount\s*\(/.test(noStrings)
  ) {
    w.push({
      severity: "warning",
      message: "WHERE ve LIMIT yok — sorgu tüm tabloyu tarıyor olabilir.",
    });
  }
  if (/\blike\s+'%/.test(lower)) {
    w.push({
      severity: "info",
      message: "Baştan joker (`LIKE '%...'`) index kullanamaz, yavaş olabilir.",
    });
  }
  if (/;\s*\S/.test(noStrings.replace(/;\s*$/, ""))) {
    w.push({
      severity: "warning",
      message: "Birden fazla ifade (`;`) var — çıktı yalnızca birine ait olabilir.",
    });
  }
  if (/\bjoin\b/.test(noStrings) && !/\bon\b|\busing\b/.test(noStrings)) {
    w.push({
      severity: "error",
      message: "JOIN var ama ON/USING koşulu yok — kartezyen çarpım riski.",
    });
  }
  return w;
}

/* ------------------------------------------------------------------ */
/* Ana kontrol fonksiyonu                                              */
/* ------------------------------------------------------------------ */

export interface CheckInput {
  output: string; // yapıştırılan CSV/TSV
  sql?: string; // opsiyonel sorgu metni
  delimiter?: ParsedTable["delimiter"];
}

export function checkQueryOutput({ output, sql, delimiter }: CheckInput): QueryCheckReport {
  const table = parseDelimited(output, delimiter);
  const sqlWarnings = checkSql(sql ?? "");
  const flags: CellFlag[] = [];

  const colCount = table.headers.length;
  const rowCount = table.rows.length;
  const emptyResult = rowCount === 0;

  // Kolon istatistikleri
  const columns: ColumnStat[] = table.headers.map((name, index) => {
    const values = table.rows.map((r) => r[index] ?? "");
    const type = inferColumnType(values);
    const nullCount = values.filter(isNullLike).length;
    const distinct = new Set(values.filter((v) => !isNullLike(v)).map((v) => v.trim()));
    return {
      name,
      index,
      type,
      dominant: type === "mixed" ? dominantConcreteType(values) : undefined,
      nullCount,
      distinctCount: distinct.size,
      looksLikeKey: KEY_NAME.test(name),
      looksLikeAmount: AMOUNT_NAME.test(name),
    };
  });

  // Benzersiz anahtar gibi görünen kolonlarda tekrar tespiti.
  // (Aynı değeri her satırda taşıyan FK/filtre kolonları — ör. musteri_no — hariç.)
  const dupValueByCol = new Map<number, Set<string>>();
  for (const col of columns) {
    if (!col.looksLikeKey || rowCount < 2) continue;
    const nonNull = table.rows
      .map((r) => (r[col.index] ?? "").trim())
      .filter((v) => v && !isNullLike(v));
    const distinct = new Set(nonNull);
    // benzersiz olması beklenen bir kolon: çoğu değer farklı olmalı
    const looksUnique = distinct.size >= Math.max(2, nonNull.length * 0.6);
    if (!looksUnique) continue;
    const seen = new Map<string, number>();
    nonNull.forEach((v) => seen.set(v, (seen.get(v) ?? 0) + 1));
    const dups = new Set([...seen.entries()].filter(([, n]) => n > 1).map(([v]) => v));
    if (dups.size) dupValueByCol.set(col.index, dups);
  }

  // Hücre bazında kontrol
  table.rows.forEach((row, r) => {
    columns.forEach((col) => {
      const c = col.index;
      const value = row[c] ?? "";
      const trimmed = value.trim();

      if (isErrorToken(trimmed)) {
        flags.push({
          row: r,
          col: c,
          value,
          kind: "error-token",
          severity: "error",
          message: `Hata işaretçisi ("${trimmed}") — sorgu/kaynak veri hatalı olabilir.`,
        });
        return;
      }

      if (isNullLike(trimmed)) {
        // Kolonun geneli doluysa NULL daha dikkat çekici
        const severity: Severity =
          col.nullCount > 0 && col.nullCount < rowCount ? "warning" : "info";
        flags.push({
          row: r,
          col: c,
          value,
          kind: "null",
          severity,
          message:
            col.type === "empty"
              ? "Boş hücre (kolonun tamamı boş)."
              : "NULL / boş hücre.",
        });
        return;
      }

      // Tip uyumsuzluğu
      if (col.type === "integer" || col.type === "number") {
        if (parseNumeric(trimmed) === null) {
          flags.push({
            row: r,
            col: c,
            value,
            kind: "type",
            severity: "error",
            message: `Sayısal kolonda sayı olmayan değer: "${trimmed}".`,
          });
          return;
        }
      } else if (col.type === "date" && !isDate(trimmed)) {
        flags.push({
          row: r,
          col: c,
          value,
          kind: "format",
          severity: "error",
          message: `Tarih kolonunda geçersiz format: "${trimmed}".`,
        });
        return;
      } else if (col.type === "boolean" && !isBoolean(trimmed)) {
        flags.push({
          row: r,
          col: c,
          value,
          kind: "type",
          severity: "warning",
          message: `Boolean kolonunda beklenmeyen değer: "${trimmed}".`,
        });
        return;
      } else if (col.type === "mixed" && col.dominant && !matchesType(trimmed, col.dominant)) {
        const dateFmt = col.dominant === "date" && looksDateish(trimmed);
        flags.push({
          row: r,
          col: c,
          value,
          kind: dateFmt || col.dominant === "date" ? "format" : "type",
          severity: "error",
          message: dateFmt
            ? `Kolonun geneli tarih; bu hücre farklı formatta: "${trimmed}".`
            : `Kolonun geneli ${col.dominant}; bu hücre uymuyor: "${trimmed}".`,
        });
        return;
      }

      // Tutar kolonunda negatif
      if (col.looksLikeAmount) {
        const n = parseNumeric(trimmed);
        if (n !== null && n < 0) {
          flags.push({
            row: r,
            col: c,
            value,
            kind: "negative",
            severity: "warning",
            message: "Tutar/miktar kolonunda negatif değer.",
          });
        }
      }

      // Anahtar tekrarları
      const dups = dupValueByCol.get(c);
      if (dups?.has(trimmed)) {
        flags.push({
          row: r,
          col: c,
          value,
          kind: "duplicate",
          severity: "warning",
          message: `Anahtar kolonda tekrar eden değer: "${trimmed}".`,
        });
      }
    });
  });

  const affectedRows = new Set(flags.map((f) => f.row)).size;
  const errors = flags.filter((f) => f.severity === "error").length +
    sqlWarnings.filter((s) => s.severity === "error").length;
  const warnings =
    flags.filter((f) => f.severity === "warning").length +
    sqlWarnings.filter((s) => s.severity === "warning").length;

  return {
    table,
    rowCount,
    colCount,
    emptyResult,
    columns,
    flags,
    sqlWarnings,
    summary: {
      errors,
      warnings,
      affectedRows,
      affectedCells: flags.length,
    },
  };
}

const KIND_LABEL: Record<FlagKind, string> = {
  empty: "Boş sonuç",
  null: "NULL / boş hücre",
  "error-token": "Hata işaretçisi",
  type: "Tip uyumsuzluğu",
  format: "Format hatası",
  negative: "Negatif tutar",
  duplicate: "Anahtar tekrarı",
};

/** Raporu panoya kopyalanabilir Markdown metnine çevirir. */
export function reportToMarkdown(r: QueryCheckReport): string {
  const L: string[] = [];
  L.push("# Sorgu Çıktısı Kontrol Raporu");
  L.push("");
  L.push(
    `- Satır: **${r.rowCount}**, Kolon: **${r.colCount}**, Ayraç: \`${
      r.table.delimiter === "\t" ? "TAB" : r.table.delimiter
    }\``,
  );
  L.push(`- Hata: **${r.summary.errors}**, Uyarı: **${r.summary.warnings}**, Etkilenen satır: **${r.summary.affectedRows}**`);

  if (r.emptyResult) {
    L.push("");
    L.push("> ⚠️ **Boş sonuç kümesi** — sorgu hiç kayıt döndürmedi.");
  }

  if (r.sqlWarnings.length) {
    L.push("");
    L.push("## SQL Uyarıları");
    r.sqlWarnings.forEach((w) => L.push(`- ${w.severity === "error" ? "❌" : "⚠️"} ${w.message}`));
  }

  L.push("");
  L.push("## Kolonlar");
  r.columns.forEach((c) =>
    L.push(
      `- \`${c.name}\` — tip: ${c.type}${c.dominant ? ` (çoğunluk: ${c.dominant})` : ""}, NULL: ${c.nullCount}/${r.rowCount}` +
        (c.looksLikeKey ? ", (anahtar)" : "") +
        (c.looksLikeAmount ? ", (tutar)" : ""),
    ),
  );

  if (r.flags.length) {
    L.push("");
    L.push("## Hücre Bulguları");
    r.flags.forEach((f) => {
      const colName = r.table.headers[f.col] ?? `kolon_${f.col + 1}`;
      L.push(
        `- Satır ${f.row + 1}, \`${colName}\` — [${KIND_LABEL[f.kind]}] ${f.message}`,
      );
    });
  } else if (!r.emptyResult) {
    L.push("");
    L.push("✅ Hücre bazında sorun bulunamadı.");
  }
  L.push("");
  return L.join("\n");
}

export { KIND_LABEL };

/** Hücre (row,col) için o hücreye ait bayrağı döndürür (varsa en yükseği). */
export function flagAt(flags: CellFlag[], row: number, col: number): CellFlag | undefined {
  const rank: Record<Severity, number> = { error: 3, warning: 2, info: 1 };
  return flags
    .filter((f) => f.row === row && f.col === col)
    .sort((a, b) => rank[b.severity] - rank[a.severity])[0];
}
