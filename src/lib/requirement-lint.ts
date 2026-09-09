/**
 * Gereksinim kalite linter'ı — ham metni Gemini'ye göndermeden önce
 * belirsiz / ölçülemeyen / eksik ifadeleri işaretler. Saf fonksiyon, API yok.
 *
 * Amaç: analisti "hızlı olsun", "gerekirse", "vs." gibi kabul kriterine
 * dönüşemeyecek ifadeler için uyarmak. Analizi engellemez — sadece öneri.
 */

export type LintCategory =
  | "belirsiz-nitelik"
  | "belirsiz-miktar"
  | "kosul-belirsiz"
  | "olculemeyen"
  | "eksik-aktor"
  | "yer-tutucu";

export interface LintFinding {
  category: LintCategory;
  /** Metinde eşleşen ifade */
  match: string;
  /** rawText içindeki başlangıç indeksi */
  index: number;
  /** Kısa açıklama / öneri */
  hint: string;
}

export const LINT_CATEGORY_LABELS: Record<LintCategory, string> = {
  "belirsiz-nitelik": "Belirsiz nitelik",
  "belirsiz-miktar": "Belirsiz miktar",
  "kosul-belirsiz": "Belirsiz koşul",
  "olculemeyen": "Ölçülemeyen hedef",
  "eksik-aktor": "Eksik aktör",
  "yer-tutucu": "Yer tutucu / eksik",
};

interface Rule {
  category: LintCategory;
  /** `g` bayraklı, kelime sınırlı regex */
  re: RegExp;
  hint: string;
}

// Türkçe kelime sınırı: harf/rakam olmayan ya da metin ucu.
// (\b latin dışı karakterlerde güvenilmez, bu yüzden lookaround kullanıyoruz.)
const B = "(?<![\\wçğıöşüÇĞİÖŞÜ])";
const E = "(?![\\wçğıöşüÇĞİÖŞÜ])";
const w = (s: string) => new RegExp(`${B}(${s})${E}`, "giu");

const RULES: Rule[] = [
  {
    category: "belirsiz-nitelik",
    re: w(
      "hızlı|yavaş|kolay|zor|basit|kullanıcı dostu|sezgisel|modern|şık|temiz|esnek|sağlam|güçlü|verimli|performanslı|ölçeklenebilir|optimize|kaliteli|profesyonel|dinamik|akıcı",
    ),
    hint: "Ölçülebilir bir kriter ekleyin (ör. \"2 sn altında yanıt\", \"3 tık içinde\").",
  },
  {
    category: "belirsiz-miktar",
    re: w(
      "birkaç|bazı|çoğu|birçok|yeterli|yeterince|makul|gerektiği kadar|ihtiyaç kadar|az sayıda|çok sayıda|bir miktar|vs\\.?|vb\\.?|gibi(?:\\s+şeyler)?|falan|filan|benzeri",
    ),
    hint: "Kesin sayı / liste verin; \"vs.\" ile biten listeler kabul kriterine dönüşmez.",
  },
  {
    category: "kosul-belirsiz",
    re: w(
      "gerekirse|gerekiyorsa|mümkünse|mümkün olduğunca|ideal olarak|tercihen|genelde|genellikle|çoğunlukla|duruma göre|olabilir|olabilirse|belki|muhtemelen|sanırım|galiba",
    ),
    hint: "Koşulu netleştirin: hangi durumda, kim karar veriyor?",
  },
  {
    category: "olculemeyen",
    re: w(
      "iyileştir(?:il)?(?:meli|mesi)?|geliştir(?:il)?(?:meli|mesi)?|artır(?:ıl)?(?:meli|malı|ması)?|azalt(?:ıl)?(?:meli|malı|ması)?|hızlandır(?:ıl)?(?:meli|malı)?|optimize et(?:il)?(?:meli|mesi)?|düzelt(?:il)?(?:meli|mesi)?",
    ),
    hint: "Hedef değeri belirtin: neyden neye? (ör. \"%20 azalt\", \"5 sn'den 2 sn'ye\").",
  },
  {
    category: "eksik-aktor",
    re: w(
      "yapılmalı(?:dır)?|edilmeli(?:dir)?|sağlanmalı(?:dır)?|gösterilmeli(?:dir)?|olmalı(?:dır)?|eklenmeli(?:dir)?|kaldırılmalı(?:dır)?|desteklenmeli(?:dir)?|engellenmeli(?:dir)?",
    ),
    hint: "Kim / hangi rol yapıyor? Edilgen cümle \"As a … I want …\" kalıbına çevrilemiyor.",
  },
  {
    category: "yer-tutucu",
    re: w("TBD|TODO|XXX|FIXME|belirlenecek|netleşecek|sonra eklenecek|\\?\\?\\?"),
    hint: "Analiz öncesi doldurulması gereken boşluk.",
  },
];

const MAX_FINDINGS = 40;

export function lintRequirement(rawText: string): LintFinding[] {
  const text = rawText ?? "";
  if (text.trim().length < 20) return [];

  const found: LintFinding[] = [];
  const seen = new Set<number>();

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text)) !== null) {
      if (m[0].trim() === "") {
        rule.re.lastIndex++;
        continue;
      }
      if (!seen.has(m.index)) {
        seen.add(m.index);
        found.push({
          category: rule.category,
          match: m[0],
          index: m.index,
          hint: rule.hint,
        });
      }
      if (found.length >= MAX_FINDINGS) return sortFindings(found);
    }
  }
  return sortFindings(found);
}

function sortFindings(list: LintFinding[]): LintFinding[] {
  return [...list].sort((a, b) => a.index - b.index);
}

export interface LintSummary {
  total: number;
  byCategory: Array<{ category: LintCategory; count: number }>;
}

export function summarizeLint(findings: LintFinding[]): LintSummary {
  const counts = new Map<LintCategory, number>();
  for (const f of findings) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  return {
    total: findings.length,
    byCategory: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}
