import { parseNumeric } from "../query-check";
import type { DateFormat, FieldType } from "./types";

export interface ValueCheck {
  ok: boolean;
  message?: string;
  /** normalize edilmiş / önerilen değer */
  suggestion?: string;
}

const OK: ValueCheck = { ok: true };

/* ------------------------------------------------------------------ */
/* Tarih                                                               */
/* ------------------------------------------------------------------ */

/** Herhangi bir yaygın formattan tarihi ayrıştırır; ISO (YYYY-MM-DD[ HH:MM]) döndürür. */
export function parseAnyDate(raw: string): { iso: string; hasTime: boolean } | null {
  const v = raw.trim();
  let m: RegExpMatchArray | null;

  // ISO: 2026-03-12 / 2026-03-12T09:30 / 2026-03-12 09:30:00
  if ((m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/))) {
    const [, y, mo, d, h, mi, s] = m;
    if (!validYMD(+y, +mo, +d)) return null;
    return {
      iso: h ? `${y}-${mo}-${d} ${h}:${mi}${s ? ":" + s : ""}` : `${y}-${mo}-${d}`,
      hasTime: !!h,
    };
  }
  // dd.mm.yyyy / dd/mm/yyyy  (+ optional time)
  if ((m = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ ](\d{2}):(\d{2})(?::(\d{2}))?)?$/))) {
    const [, d, mo, y, h, mi, s] = m;
    if (!validYMD(+y, +mo, +d)) return null;
    const dd = d.padStart(2, "0");
    const mm = mo.padStart(2, "0");
    return {
      iso: h ? `${y}-${mm}-${dd} ${h}:${mi}${s ? ":" + s : ""}` : `${y}-${mm}-${dd}`,
      hasTime: !!h,
    };
  }
  // yyyy/mm/dd
  if ((m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) {
    const [, y, mo, d] = m;
    if (!validYMD(+y, +mo, +d)) return null;
    return { iso: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, hasTime: false };
  }
  return null;
}

function validYMD(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function matchesDateFormat(raw: string, fmt: DateFormat): boolean {
  const v = raw.trim();
  switch (fmt) {
    case "iso":
      return /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(v);
    case "dd.mm.yyyy":
      return /^\d{2}\.\d{2}\.\d{4}([ ]\d{2}:\d{2}(:\d{2})?)?$/.test(v);
    case "dd/mm/yyyy":
      return /^\d{2}\/\d{2}\/\d{4}([ ]\d{2}:\d{2}(:\d{2})?)?$/.test(v);
    default:
      return parseAnyDate(v) !== null;
  }
}

/* ------------------------------------------------------------------ */
/* Kimlik / iletişim doğrulayıcıları                                   */
/* ------------------------------------------------------------------ */

export function isValidTckn(raw: string): boolean {
  const v = raw.trim();
  if (!/^\d{11}$/.test(v)) return false;
  const d = v.split("").map(Number);
  if (d[0] === 0) return false;
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (odd * 7 - even + 100) % 10;
  const d11 = (d.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
  return d10 === d[9] && d11 === d[10];
}

export function isValidIban(raw: string): boolean {
  const v = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v)) return false;
  const rearranged = v.slice(4) + v.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  // mod-97, parça parça
  let remainder = 0;
  for (const chunk of numeric.match(/\d{1,7}/g) ?? []) {
    remainder = (remainder * 10 ** chunk.length + Number(chunk)) % 97;
  }
  return remainder === 1;
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

/** TR telefon: +90 5xx xxx xx xx / 05xx... / 5xx... — esnek */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  let d = digits;
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (/^5\d{9}$/.test(d)) return `+90${d}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Tip doğrulama (öneri ile)                                           */
/* ------------------------------------------------------------------ */

export function checkType(
  value: string,
  type: FieldType,
  dateFormat: DateFormat = "auto",
): ValueCheck {
  const v = value.trim();

  switch (type) {
    case "text":
      return OK;

    case "integer": {
      const n = parseNumeric(v);
      if (n === null) return { ok: false, message: `Tam sayı bekleniyor: "${v}"` };
      if (!Number.isInteger(n))
        return { ok: false, message: `Ondalık değer, tam sayı bekleniyor: "${v}"`, suggestion: String(Math.trunc(n)) };
      return { ok: true, suggestion: String(n) };
    }

    case "number":
    case "money": {
      const n = parseNumeric(v);
      if (n === null) return { ok: false, message: `Sayısal değer bekleniyor: "${v}"` };
      const norm = type === "money" ? n.toFixed(2) : String(n);
      return { ok: true, suggestion: norm !== v ? norm : undefined };
    }

    case "boolean": {
      const t = v.toLowerCase();
      const truthy = ["true", "1", "evet", "e", "yes", "t"];
      const falsy = ["false", "0", "hayır", "hayir", "h", "no", "f"];
      if (truthy.includes(t)) return { ok: true, suggestion: v === "true" ? undefined : "true" };
      if (falsy.includes(t)) return { ok: true, suggestion: v === "false" ? undefined : "false" };
      return { ok: false, message: `Boolean bekleniyor: "${v}"` };
    }

    case "date":
    case "datetime": {
      if (matchesDateFormat(v, dateFormat)) {
        const p = parseAnyDate(v);
        return { ok: true, suggestion: p && p.iso !== v ? p.iso : undefined };
      }
      const parsed = parseAnyDate(v);
      if (parsed) {
        return {
          ok: false,
          message:
            dateFormat === "auto"
              ? `Tarih ayrıştırıldı ama karışık format: "${v}"`
              : `Beklenen format ${dateFormat}, gelen: "${v}"`,
          suggestion: parsed.iso,
        };
      }
      return { ok: false, message: `Geçersiz tarih: "${v}"` };
    }

    case "email":
      return isValidEmail(v)
        ? { ok: true, suggestion: v !== v.toLowerCase() ? v.toLowerCase() : undefined }
        : { ok: false, message: `Geçersiz e-posta: "${v}"` };

    case "iban": {
      const compact = v.replace(/\s+/g, "").toUpperCase();
      return isValidIban(v)
        ? { ok: true, suggestion: compact !== v ? compact : undefined }
        : { ok: false, message: `Geçersiz IBAN (mod-97 tutmuyor): "${v}"` };
    }

    case "tckn":
      return isValidTckn(v)
        ? OK
        : { ok: false, message: `Geçersiz TCKN (kontrol hanesi tutmuyor): "${v}"` };

    case "phone": {
      const n = normalizePhone(v);
      return n
        ? { ok: true, suggestion: n !== v ? n : undefined }
        : { ok: false, message: `Geçersiz telefon: "${v}"` };
    }

    default:
      return OK;
  }
}

/** min/max karşılaştırması için değeri karşılaştırılabilir sayıya çevirir. */
export function comparableValue(value: string, type: FieldType | undefined): number | null {
  if (type === "date" || type === "datetime") {
    const p = parseAnyDate(value);
    if (!p) return null;
    return new Date(p.iso.replace(" ", "T") + (p.hasTime ? "" : "T00:00:00")).getTime();
  }
  if (type === "text" || type === undefined) return value.trim().length;
  return parseNumeric(value);
}

export function comparableBound(bound: number | string, type: FieldType | undefined): number | null {
  if (typeof bound === "number") {
    if (type === "date" || type === "datetime") return null;
    return bound;
  }
  if (type === "date" || type === "datetime") {
    const p = parseAnyDate(bound);
    return p ? new Date(p.iso.replace(" ", "T")).getTime() : Date.parse(bound) || null;
  }
  return parseNumeric(bound);
}

export { matchesDateFormat };
