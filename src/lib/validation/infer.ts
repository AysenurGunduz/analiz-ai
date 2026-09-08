import { isErrorToken, isNullLike, parseNumeric, type ParsedTable } from "../query-check";
import { isValidEmail, isValidIban, isValidTckn, normalizePhone, parseAnyDate } from "./validators";
import type { DateFormat, FieldRule, FieldType, Schema } from "./types";

/** Bir kolondaki tarih değerlerinin baskın somut formatını bulur (auto yerine). */
function dominantDateFormat(values: string[]): DateFormat {
  const tally: Record<Exclude<DateFormat, "auto">, number> = {
    iso: 0,
    "dd.mm.yyyy": 0,
    "dd/mm/yyyy": 0,
  };
  for (const raw of values) {
    const v = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) tally.iso++;
    else if (/^\d{2}\.\d{2}\.\d{4}/.test(v)) tally["dd.mm.yyyy"]++;
    else if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) tally["dd/mm/yyyy"]++;
  }
  const top = (Object.entries(tally) as Array<[Exclude<DateFormat, "auto">, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  return top && top[1] > 0 ? top[0] : "auto";
}

const KEY_NAME = /(^|[_\s])(id|no|kod|code|key|tckn|vkn|iban|uuid|guid|ref)([_\s]|$)/i;
const AMOUNT_NAME =
  /(tutar|bakiye|fiyat|price|amount|balance|hacim|volume|komisyon|maliyet|nav|deger|değer)/i;
const NONNEG_NAME = /(adet|miktar|quantity|qty|say[ıi]|count|lot)/i;
const EMAIL_NAME = /(e.?posta|email|mail)/i;
const PHONE_NAME = /(telefon|gsm|phone|cep|msisdn)/i;
const DATE_NAME = /(tarih|date|zaman|time|gun|gün)/i;

function share(values: string[], fn: (v: string) => boolean): number {
  const usable = values.filter((v) => !isNullLike(v) && !isErrorToken(v));
  if (!usable.length) return 0;
  return usable.filter(fn).length / usable.length;
}

/** Bir kolonun değerlerinden en olası FieldType'ı çıkarır. */
export function inferFieldType(name: string, values: string[]): FieldType | "empty" | "mixed" {
  const usable = values.filter((v) => !isNullLike(v) && !isErrorToken(v));
  if (usable.length === 0) return "empty";

  if (share(values, (v) => isValidTckn(v)) >= 0.9) return "tckn";
  if (share(values, (v) => isValidIban(v)) >= 0.9) return "iban";
  if (EMAIL_NAME.test(name) || share(values, isValidEmail) >= 0.9) {
    if (share(values, isValidEmail) >= 0.6) return "email";
  }
  if (PHONE_NAME.test(name) && share(values, (v) => normalizePhone(v) !== null) >= 0.6)
    return "phone";

  const boolShare = share(values, (v) =>
    ["true", "false", "0", "1", "evet", "hayır", "hayir"].includes(v.trim().toLowerCase()),
  );
  if (boolShare === 1 && new Set(usable.map((v) => v.toLowerCase())).size <= 3) return "boolean";

  const dateShare = share(values, (v) => parseAnyDate(v) !== null);
  if (dateShare >= 0.8) {
    const anyTime = usable.some((v) => parseAnyDate(v)?.hasTime);
    return anyTime ? "datetime" : "date";
  }

  const numShare = share(values, (v) => parseNumeric(v) !== null);
  if (numShare === 1) {
    const allInt = usable.every((v) => Number.isInteger(parseNumeric(v)!));
    if (AMOUNT_NAME.test(name)) return "money";
    return allInt ? "integer" : "number";
  }
  if (numShare > 0 && numShare < 1) return "mixed";
  if (dateShare > 0 && dateShare < 0.8) return "mixed";

  return "text";
}

/** Veriden aday şema üretir (sıfır ayar başlangıç noktası). */
export function inferSchema(table: ParsedTable): Schema {
  const fields: FieldRule[] = table.headers.map((name, index) => {
    const values = table.rows.map((r) => r[index] ?? "");
    const inferred = inferFieldType(name, values);
    const nulls = values.filter(isNullLike).length;
    const distinct = new Set(values.filter((v) => !isNullLike(v)).map((v) => v.trim()));

    const rule: FieldRule = { column: name };

    if (inferred !== "empty" && inferred !== "mixed") rule.type = inferred;
    else if (inferred === "mixed" && (DATE_NAME.test(name) || AMOUNT_NAME.test(name))) {
      rule.type = AMOUNT_NAME.test(name) ? "money" : "date";
    }

    // hiç boş yoksa ve kolon anlamlıysa zorunlu kabul et
    if (nulls === 0 && values.length > 0) rule.required = true;

    // benzersiz: anahtar isimli VE (tamamen benzersiz ya da benzersiz OLMASI beklenip birkaç tekrarı olan)
    const nonNullCount = values.filter((v) => !isNullLike(v)).length;
    if (KEY_NAME.test(name) && nonNullCount >= 3 && distinct.size >= nonNullCount * 0.7) {
      rule.unique = true;
    }

    if (rule.type === "money") rule.min = 0;
    if ((rule.type === "integer" || rule.type === "number") && NONNEG_NAME.test(name)) {
      rule.min = 0;
    }
    // tarih kolonunda "auto" yerine baskın formatı sabitle → karışık format yakalanır
    if (rule.type === "date" || rule.type === "datetime") {
      const fmt = dominantDateFormat(values);
      if (fmt !== "auto") rule.dateFormat = fmt;
    }

    return rule;
  });

  return { name: "Çıkarılan şema", fields };
}
