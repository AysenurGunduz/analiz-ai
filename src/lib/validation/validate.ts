import {
  detectDelimiter,
  isErrorToken,
  isNullLike,
  parseDelimited,
  type ParsedTable,
} from "../query-check";
import { inferFieldType, inferSchema } from "./infer";
import {
  checkType,
  comparableBound,
  comparableValue,
  parseAnyDate,
} from "./validators";
import {
  ISSUE_LABELS,
  type ColumnSummary,
  type FieldRule,
  type IssueCode,
  type Schema,
  type Severity,
  type ValidationIssue,
  type ValidationReport,
} from "./types";

export interface ValidateInput {
  data: string;
  schema?: Schema;
  delimiter?: ParsedTable["delimiter"];
  /** true: şemada olmayan kolonlarda da genel kontroller (hata işaretçisi, tutarsız tip) */
  checkUnlistedColumns?: boolean;
}

function push(
  issues: ValidationIssue[],
  base: Omit<ValidationIssue, "code" | "severity" | "message" | "suggestion">,
  code: IssueCode,
  severity: Severity,
  message: string,
  suggestion?: string,
) {
  issues.push({ ...base, code, severity, message, suggestion });
}

export function validateDataset(input: ValidateInput): ValidationReport {
  const delimiter = input.delimiter ?? detectDelimiter(input.data);
  const table = parseDelimited(input.data, delimiter);
  const schema: Schema =
    input.schema && input.schema.fields.length
      ? input.schema
      : inferSchema(table);

  const rowCount = table.rows.length;
  const columnCount = table.headers.length;
  const issues: ValidationIssue[] = [];

  const ruleByColumn = new Map<string, FieldRule>();
  schema.fields.forEach((f) => ruleByColumn.set(f.column, f));

  const colSummaries: ColumnSummary[] = table.headers.map((column, index) => {
    const values = table.rows.map((r) => r[index] ?? "");
    return {
      column,
      index,
      inferredType: inferFieldType(column, values),
      ruleType: ruleByColumn.get(column)?.type,
      total: rowCount,
      nulls: values.filter(isNullLike).length,
      distinct: new Set(values.filter((v) => !isNullLike(v)).map((v) => v.trim())).size,
      issues: 0,
    };
  });

  // Şemada tanımlı ama veride olmayan kolonlar
  for (const f of schema.fields) {
    if (!table.headers.includes(f.column)) {
      push(
        issues,
        { row: -1, column: f.column, columnIndex: -1, value: "" },
        "unknown-column",
        "warning",
        `Şemada "${f.column}" var ama çıktıda bu kolon yok.`,
      );
    }
  }

  // Uniqueness için değer sayacı
  const seenByCol = new Map<number, Map<string, number>>();

  table.headers.forEach((column, colIndex) => {
    const rule = ruleByColumn.get(column);
    const values = table.rows.map((r) => r[colIndex] ?? "");

    // tutarsız tip (şema yoksa / type belirtilmemişse)
    if (!rule?.type && (input.checkUnlistedColumns ?? true)) {
      const t = colSummaries[colIndex].inferredType;
      if (t === "mixed") {
        // baskın tipe uymayanları işaretle
        const concrete = dominantConcrete(values);
        values.forEach((v, r) => {
          const tv = v.trim();
          if (isNullLike(tv) || isErrorToken(tv)) return;
          if (!matchesConcrete(tv, concrete)) {
            push(
              issues,
              { row: r, column, columnIndex: colIndex, value: v },
              "inconsistent-type",
              "warning",
              `Kolonun geneli ${concrete}; bu hücre uymuyor: "${tv}"`,
              concrete === "date" ? parseAnyDate(tv)?.iso : undefined,
            );
          }
        });
      }
    }

    values.forEach((value, rowIndex) => {
      const v = value.trim();
      const base = { row: rowIndex, column, columnIndex: colIndex, value };

      // 1) hata işaretçisi — her zaman
      if (isErrorToken(v)) {
        push(issues, base, "error-token", "error", `Hata işaretçisi: "${v}"`);
        return;
      }

      const empty = isNullLike(v);

      // 2) zorunluluk
      if (empty) {
        if (rule?.required) {
          push(issues, base, "required-missing", "error", "Zorunlu alan boş / NULL.");
        }
        return; // boş hücrede diğer kontroller çalışmaz
      }

      if (!rule) return; // şemasız kolon: sadece yukarıdaki genel kontroller

      // 3) tip + format
      if (rule.type) {
        const res = checkType(v, rule.type, rule.dateFormat ?? "auto");
        if (!res.ok) {
          const isDate = rule.type === "date" || rule.type === "datetime";
          push(
            issues,
            base,
            isDate ? "format-invalid" : "type-mismatch",
            "error",
            res.message ?? "Geçersiz değer.",
            res.suggestion,
          );
          return;
        }
      }

      // 4) izinli değerler
      if (rule.allowed && rule.allowed.length) {
        const hit = rule.ignoreCase
          ? rule.allowed.some((a) => a.toLowerCase() === v.toLowerCase())
          : rule.allowed.includes(v);
        if (!hit) {
          push(
            issues,
            base,
            "not-allowed",
            "error",
            `İzinli değil. Beklenen: ${rule.allowed.join(", ")}`,
          );
        }
      }

      // 5) regex
      if (rule.pattern) {
        try {
          const re = new RegExp(rule.pattern, rule.ignoreCase ? "i" : "");
          if (!re.test(v)) {
            push(issues, base, "pattern-mismatch", "warning", `Desene uymuyor: /${rule.pattern}/`);
          }
        } catch {
          /* geçersiz regex — sessiz geç */
        }
      }

      // 6) min / max
      const cv = comparableValue(v, rule.type);
      if (cv !== null) {
        if (rule.min !== undefined) {
          const b = comparableBound(rule.min, rule.type);
          if (b !== null && cv < b) {
            push(
              issues,
              base,
              rule.type === "text" ? "too-short" : "out-of-range",
              "warning",
              rule.type === "text"
                ? `Çok kısa (min ${rule.min} karakter).`
                : `Alt sınır ${rule.min} — değer daha küçük.`,
            );
          }
        }
        if (rule.max !== undefined) {
          const b = comparableBound(rule.max, rule.type);
          if (b !== null && cv > b) {
            push(
              issues,
              base,
              rule.type === "text" ? "too-long" : "out-of-range",
              "warning",
              rule.type === "text"
                ? `Çok uzun (max ${rule.max} karakter).`
                : `Üst sınır ${rule.max} — değer daha büyük.`,
            );
          }
        }
      }

      // 7) tarih: gelecek / geçmiş
      if ((rule.notFuture || rule.notPast) && (rule.type === "date" || rule.type === "datetime")) {
        const p = parseAnyDate(v);
        if (p) {
          const t = Date.parse(p.iso.replace(" ", "T"));
          const now = Date.now();
          if (rule.notFuture && t > now) {
            push(issues, base, "future-date", "warning", "Tarih gelecekte.");
          }
          if (rule.notPast && t < now - 86400000) {
            push(issues, base, "past-date", "warning", "Tarih geçmişte.");
          }
        }
      }

      // 8) benzersizlik
      if (rule.unique) {
        let m = seenByCol.get(colIndex);
        if (!m) {
          m = new Map();
          seenByCol.set(colIndex, m);
        }
        m.set(v, (m.get(v) ?? 0) + 1);
      }
    });
  });

  // benzersizlik ihlallerini işaretle (ikinci geçiş)
  for (const [colIndex, counts] of seenByCol) {
    const column = table.headers[colIndex];
    table.rows.forEach((row, rowIndex) => {
      const v = (row[colIndex] ?? "").trim();
      if (v && (counts.get(v) ?? 0) > 1) {
        push(
          issues,
          { row: rowIndex, column, columnIndex: colIndex, value: row[colIndex] ?? "" },
          "duplicate",
          "error",
          `Benzersiz kolonda tekrar: "${v}" (${counts.get(v)}×)`,
        );
      }
    });
  }

  // özet
  issues.forEach((i) => {
    if (i.columnIndex >= 0) colSummaries[i.columnIndex].issues++;
  });
  const affectedRows = new Set(issues.filter((i) => i.row >= 0).map((i) => i.row));
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  return {
    rowCount,
    columnCount,
    emptyResult: rowCount === 0,
    schema,
    columns: colSummaries,
    issues,
    summary: {
      errors,
      warnings,
      infos,
      affectedRows: affectedRows.size,
      cleanRows: Math.max(0, rowCount - affectedRows.size),
    },
  };
}

/* -- yardımcılar -- */

function dominantConcrete(values: string[]): "number" | "date" | "text" | "boolean" {
  const tally = { number: 0, date: 0, text: 0, boolean: 0 };
  for (const raw of values) {
    const v = raw.trim();
    if (isNullLike(v) || isErrorToken(v)) continue;
    if (["true", "false", "0", "1"].includes(v.toLowerCase())) tally.boolean++;
    else if (parseAnyDate(v)) tally.date++;
    else if (/^-?[\d.,]+$/.test(v) && /\d/.test(v)) tally.number++;
    else tally.text++;
  }
  return (Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "text") as
    | "number"
    | "date"
    | "text"
    | "boolean";
}

function matchesConcrete(v: string, t: "number" | "date" | "text" | "boolean"): boolean {
  switch (t) {
    case "number":
      return /^-?[\d.,]+$/.test(v) && /\d/.test(v);
    case "date":
      return parseAnyDate(v) !== null;
    case "boolean":
      return ["true", "false", "0", "1"].includes(v.toLowerCase());
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/* Şema JSON (import / export)                                         */
/* ------------------------------------------------------------------ */

export function schemaToJson(schema: Schema): string {
  return JSON.stringify(schema, null, 2);
}

export function schemaFromJson(text: string): { schema: Schema } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "Geçersiz JSON." };
  }
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as Schema).fields)) {
    return { error: "Şema formatı hatalı: `fields` dizisi bekleniyor." };
  }
  const fields: FieldRule[] = [];
  for (const f of (raw as Schema).fields) {
    if (!f || typeof f.column !== "string") {
      return { error: "Her alan bir `column` (string) içermeli." };
    }
    fields.push(f);
  }
  return { schema: { name: (raw as Schema).name, fields } };
}

/* ------------------------------------------------------------------ */
/* Markdown rapor                                                      */
/* ------------------------------------------------------------------ */

export function validationReportToMarkdown(r: ValidationReport): string {
  const L: string[] = [];
  L.push("# Veri Doğrulama Raporu");
  L.push("");
  L.push(
    `- Satır: **${r.rowCount}** (temiz: ${r.summary.cleanRows}, sorunlu: ${r.summary.affectedRows}) · Kolon: **${r.columnCount}**`,
  );
  L.push(`- Hata: **${r.summary.errors}** · Uyarı: **${r.summary.warnings}** · Bilgi: ${r.summary.infos}`);
  if (r.emptyResult) L.push("\n> ⚠️ Boş veri kümesi.");

  L.push("\n## Şema");
  r.schema.fields.forEach((f) => {
    const parts = [f.type ?? "—"];
    if (f.required) parts.push("zorunlu");
    if (f.unique) parts.push("benzersiz");
    if (f.min !== undefined) parts.push(`min ${f.min}`);
    if (f.max !== undefined) parts.push(`max ${f.max}`);
    if (f.allowed?.length) parts.push(`[${f.allowed.join("|")}]`);
    if (f.pattern) parts.push(`/${f.pattern}/`);
    if (f.notFuture) parts.push("gelecek olamaz");
    L.push(`- \`${f.column}\` — ${parts.join(", ")}`);
  });

  if (r.issues.length) {
    L.push("\n## Bulgular");
    r.issues.forEach((i) => {
      const loc = i.row >= 0 ? `Satır ${i.row + 1}, ` : "";
      L.push(
        `- ${i.severity === "error" ? "❌" : "⚠️"} ${loc}\`${i.column}\` — [${ISSUE_LABELS[i.code]}] ${i.message}` +
          (i.suggestion ? ` → öneri: \`${i.suggestion}\`` : ""),
      );
    });
  } else if (!r.emptyResult) {
    L.push("\n✅ Şemaya göre sorun bulunamadı.");
  }
  L.push("");
  return L.join("\n");
}
