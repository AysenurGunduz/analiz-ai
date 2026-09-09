# ReqToStory — Implementation Notları

Bu belge, projenin nasıl kurulduğunu, hangi kararların neden alındığını ve veri
akışını anlatır. Kod okumadan önce buraya bakılabilir.

---

## 1. Genel Bakış

ReqToStory, tek ekranlık bir iç araçtır:

```
[Sol Panel: Ham Girdi] ──POST /api/generate──▶ [Gemini] ──JSON──▶ [Zod doğrulama] ──▶ [Sağ Panel: Kartlar]
```

- **Girdi:** serbest metin + opsiyonel `projectType` / `audienceRole`
- **Çıktı:** `AnalysisResult` (başlık, özet, varsayımlar, açık sorular, hikayeler)
- **Her hikaye:** User Story + Gherkin kabul kriterleri + edge case + iş kuralları
- **Dışa aktarma:** Markdown / Jira wiki markup (kopyala), `.md` / `.json` (indir)

---

## 2. Teknoloji Kararları

| Karar | Seçim | Neden |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, `src/`) | API Route + UI tek projede; serverless deploy kolay |
| Stil | Tailwind CSS v4 | Hızlı, bağımlılıksız; v4 sıfır-config |
| Bileşen kütüphanesi | **Elle yazılmış** (shadcn görünümü) | shadcn CLI Tailwind v4 + Next 16 ile sürtünmeli; MVP'de gereksiz kurulum yükü. Bileşenler yine de shadcn diline yakın (radius, border, muted renkler) |
| İkonlar | `lucide-react` | shadcn ekosisteminin standardı, ağaç-sarsılabilir |
| LLM | Google Gemini `gemini-3.6-flash` | Kullanıcının API anahtarı var; hızlı; `responseSchema` ile yapısal çıktı. `gemini-2.0-flash` API'den kaldırıldı (503→retry mantığı eklendi) |
| LLM SDK | `@google/genai` v2.x | Google'ın güncel resmi SDK'sı (`@google/generative-ai` eski) |
| Doğrulama | `zod` | Tek şema → hem TS tipi hem runtime doğrulama |
| Markdown önizleme | (henüz yok) | 3. güne bırakıldı; `react-markdown` opsiyonel |

---

## 3. Dosya Haritası ve Sorumluluklar

```
src/
├── app/
│   ├── layout.tsx              # Root layout, Türkçe <html lang>, font değişkenleri, metadata
│   ├── globals.css             # Tailwind import + light/dark renk tokenları
│   ├── page.tsx                # "use client" — tüm sayfa state'i + fetch orkestrasyonu
│   └── api/
│       └── generate/route.ts   # POST endpoint: istek doğrula → generateAnalysis → yanıt
├── components/
│   ├── InputPanel.tsx          # textarea + select'ler + örnek butonları + submit
│   ├── OutputPanel.tsx         # loading/error/empty durumları, özet kutusu, export bar
│   ├── StoryCard.tsx           # tek hikaye kartı (story + AC + edge + rules)
│   ├── GherkinBlock.tsx        # Given/When/Then renklendirme + senaryo kopyala
│   └── CopyButton.tsx          # navigator.clipboard + "Kopyalandı" geri bildirimi
└── lib/
    ├── types.ts                # ⭐ TEK DOĞRULUK KAYNAĞI — tüm Zod şemaları + türetilen tipler
    ├── prompt.ts               # SYSTEM_PROMPT sabiti + buildUserPrompt(req)
    ├── gemini.ts               # GoogleGenAI istemcisi, RESPONSE_SCHEMA, parse + Zod doğrulama
    ├── export.ts               # toMarkdown / toJira / toJson / downloadFile
    ├── samples.ts              # SAMPLES[] — hızlı test senaryoları
    └── cn.ts                   # className birleştirici yardımcı
```

---

## 4. Veri Modeli (`src/lib/types.ts`)

Zod şeması hem istemcide (tip) hem API'de (runtime doğrulama) kullanılır.

```
GenerateRequest
├── rawText: string        (trim, 20–12000 karakter)
├── projectType?: "Web" | "Mobil" | "API" | "Finans/Portföy"
└── audienceRole?: "Müşteri" | "Portföy Yöneticisi" | ...

AnalysisResult
├── title: string
├── summary: string
├── assumptions: string[]        # metinde net olmayan, model'in varsaydığı noktalar
├── openQuestions: string[]      # analistin müşteriye sorması gerekenler
└── stories: UserStory[]         (en az 1)
     ├── id: string              # "US-01"
     ├── title: string
     ├── priority: "Yüksek" | "Orta" | "Düşük"
     ├── role / feature / benefit # As a / I want / So that
     ├── acceptanceCriteria: GherkinScenario[]  (en az 1)
     │    ├── name: string
     │    ├── given: string[]    (en az 1)
     │    ├── when: string[]     (en az 1)
     │    └── then: string[]     (en az 1)
     ├── edgeCases: string[]     # hata, limit aşımı, yetki, timeout, eşzamanlılık
     └── businessRules: string[] # validasyon, zorunlu alan, format, durum geçişi
```

**Önemli:** `gemini.ts` içindeki `RESPONSE_SCHEMA` (Gemini'nin OpenAPI alt kümesi
formatı) bu Zod şemasıyla **elle senkron tutulmalıdır**. Alan eklenince iki yerde
de güncelle.

---

## 5. İstek Yaşam Döngüsü

1. **Kullanıcı** textarea'yı doldurur, opsiyonel select'leri seçer, "Analiz Et"e basar.
2. **`page.tsx`** `handleSubmit`:
   - `loading = true`, önceki sonuç/hata temizlenir
   - `fetch("/api/generate", { method: POST, body: { rawText, projectType?, audienceRole? } })`
3. **`route.ts`**:
   - Gövde JSON parse edilir (başarısız → 400)
   - `GenerateRequestSchema.safeParse` (başarısız → 422, Türkçe mesajlarla)
   - `generateAnalysis(parsed.data)` çağrılır
4. **`gemini.ts` `generateAnalysis`**:
   - `GEMINI_API_KEY` kontrol edilir (yoksa açıklayıcı hata)
   - `ai.models.generateContent`:
     - `model`: env `GEMINI_MODEL` ya da `gemini-3.6-flash`
     - 503/429/500 durumunda üstel bekleme ile 3 kez tekrar (`generateWithRetry`)
     - `systemInstruction`: `SYSTEM_PROMPT`
     - `contents`: `buildUserPrompt(req)` (bağlam + ham metin)
     - `responseMimeType: "application/json"` + `responseSchema: RESPONSE_SCHEMA`
     - `temperature: 0.3` (tutarlılık için düşük), `maxOutputTokens: 8192`
   - `res.text` → `JSON.parse` (başarısız → hata)
   - `AnalysisResultSchema.safeParse` (başarısız → hangi alanın neden hatalı olduğu mesajda)
5. **`route.ts`** başarılıysa `{ ok: true, data }` (200), hata olursa `{ ok: false, error }` (502)
6. **`page.tsx`** yanıta göre `result` veya `error` set eder, `loading = false`
7. **`OutputPanel`** yeniden render:
   - `loading` → skeleton kartlar + "Gemini analiz ediyor…"
   - `error` → kırmızı kutu
   - `result` → özet + export bar + varsayım/soru kutuları + hikaye kartları

---

## 6. Prompt Stratejisi (`src/lib/prompt.ts`)

İki katmanlı garanti:

1. **`responseSchema`** — Gemini'yi JSON yapısına *teknik olarak* zorlar (alan adları, tipler, zorunlular).
2. **`SYSTEM_PROMPT`** — *içerik kalitesini* belirler:
   - Türkçe çıktı (teknik terimler hariç)
   - Gherkin ölçülebilir/test edilebilir olacak, "hızlı/kullanıcı dostu" gibi belirsizlik yasak
   - Her hikaye ≥ 1 mutlu yol + ≥ 1 negatif senaryo
   - Eksik bilgi uydurma → `assumptions` / `openQuestions`
   - Kısa/anlamsız girdi → tek hikaye + netleştirici sorular
   - Büyük talebi INVEST'e göre böl

`buildUserPrompt` seçili `projectType` / `audienceRole` değerlerini "BAĞLAM" bloğu
olarak metnin başına ekler; ham metin `"""` ile sınırlandırılır (prompt injection'a
karşı basit sınır).

---

## 7. Edge Case Yönetimi

| Durum | Nerede | Davranış |
| --- | --- | --- |
| Boş / < 20 karakter | `InputPanel` (buton pasif) + `route.ts` (422) | Türkçe uyarı, sayaç turuncuya döner |
| > 12000 karakter | `GenerateRequestSchema` | 422 |
| Geçersiz JSON gövdesi | `route.ts` | 400 |
| `GEMINI_API_KEY` yok | `gemini.ts` | 502 + kurulum talimatı |
| Model boş yanıt | `gemini.ts` | 502 "tekrar deneyin" |
| Model geçersiz JSON | `gemini.ts` | 502 |
| Model şemaya uymayan JSON | `gemini.ts` (Zod) | 502 + hatalı alan listesi |
| Ağ hatası (fetch reject) | `page.tsx` | "Sunucuya ulaşılamadı" |
| Anlamsız ama geçerli girdi | `SYSTEM_PROMPT` kuralı | Model tek hikaye + `openQuestions` üretir |
| `navigator.clipboard` yok | `CopyButton` | Sessizce geçer (hata basmaz) |

---

## 8. Dışa Aktarma (`src/lib/export.ts`)

- `toMarkdown` — başlıklar, `**As a**`, ```` ```gherkin ```` bloğu, madde listeleri
- `toJira` — `h1.`/`h2.`, `{code:gherkin}`, `*bold*`, `*` madde işareti (Jira wiki markup)
- `toJson` — `JSON.stringify(result, null, 2)`
- `downloadFile` — Blob + geçici `<a download>` (tarayıcıda çalışır; artifact ortamında değil)

Gherkin satır üretimi tek yerde (`gherkinLines` / `scenarioToText`) — birden fazla
`given`/`when`/`then` varsa ilki anahtar kelime, sonrakiler `And`.

---

## 9. Ortam Değişkenleri

| Değişken | Zorunlu | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | ✅ | — | https://aistudio.google.com/app/apikey |
| `GEMINI_MODEL` | ❌ | `gemini-3.6-flash` | Geçerli bir Gemini model adı |

`.env.local` git'e girmez (`.gitignore` → `.env*`). Şablon: `.env.example`.

---

## 10. Yapılanlar / Kalanlar

### Tamamlandı (1–2. gün)
- [x] Next.js 16 + Tailwind v4 kurulumu
- [x] İki panelli layout (sol girdi / sağ çıktı, sticky sol panel)
- [x] Zod şeması + TS tipleri
- [x] System prompt + user prompt üretici
- [x] Gemini API entegrasyonu (`responseSchema` ile yapısal çıktı)
- [x] `/api/generate` route + istek/çıktı doğrulama + hata yönetimi
- [x] Çıktı kartları: Gherkin renklendirme, priority rozetleri, edge/rule listeleri
- [x] Loading skeleton, error, empty durumları
- [x] Kopyala butonları (Markdown / Jira / senaryo / hikaye)
- [x] `.md` / `.json` indirme
- [x] Hızlı örnek senaryolar (4 adet, biri kasıtlı belirsiz)
- [x] `npm run build` + `eslint` temiz

### UI redesign + polish (kullanıcı geri bildirimi sonrası)
- [x] Linear/Vercel tarzı koyu tema, tasarım token'ları, mono aksanlar
- [x] Net `01 · Girdi` / `02 · Analiz` akış etiketleri, sticky header
- [x] Responsive doğrulama (390 / 820 / 1440 px — yatay taşma yok, CDP ile ölçüldü)
- [x] `?demo=1` — API anahtarı olmadan örnek çıktı (`src/lib/demo.ts`), demo/önizleme için
- [x] Hikaye başına "md" kopyala butonu (`storyToMarkdown`)
- [x] ⌘/Ctrl + Enter ile gönderme
- [x] "temizle" butonu + taslağın `localStorage`'a otomatik kaydı (`reqtostory:draft`)

### Gerçek Gemini testi (feat/gemini-live-test)
- [x] `gemini-3.6-flash` ile uçtan uca test — 4 örnek senaryo, çıktı kalitesi iyi
- [x] Belirsiz girdi davranışı doğrulandı (tek hikaye + openQuestions)
- [x] 503/429 retry mantığı (`generateWithRetry`, üstel bekleme)
- [x] `demo.ts` gerçek çıktıyla güncellendi
- Prompt ince ayarı: gerek görülmedi, çıktılar şemaya ve dile uygun

### Sorgu Çıktısı Kontrolü modülü (feat/sorgu-cikti-kontrol)
İkinci sayfa: `/sorgu-kontrol`. Analist SQL çıktısını (CSV/TSV) + opsiyonel sorgu metnini
yapıştırır; saf istemci fonksiyonu kontrol eder (API yok, veri sunucuya gitmez).

- `src/lib/query-check.ts` — `parseDelimited` (tırnak/kaçış destekli, ayraç otomatik),
  `inferColumnType` + `dominantConcreteType` (mixed kolonda çoğunluk tipi),
  `checkSql` (`= NULL`, `SELECT *`, WHERE/LIMIT yok, JOIN'de ON yok, baştan joker),
  `checkQueryOutput` (ana fonksiyon), `reportToMarkdown`
- Kontroller: boş sonuç kümesi · NULL/boş hücre · hata işaretçisi (`#REF!`, `ORA-`, `NaN`…) ·
  tip uyumsuzluğu · tarih format tutarsızlığı · tutar kolonunda negatif ·
  benzersiz anahtar kolonunda tekrar (FK/filtre kolonları hariç: distinct oranı ile ayırt)
- `src/components/QueryReport.tsx` — özet çipleri, boş-sonuç banner'ı, SQL uyarıları,
  hücreleri renklendiren tablo (kırmızı=hata, sarı=uyarı, ∅=boş), bulgu listesi, "rapor" kopyala
- `src/lib/query-samples.ts` — 3 örnek (hatalı satırlar / boş küme / temiz)
- `src/components/SiteNav.tsx` — header'da Analiz ↔ Sorgu Kontrolü geçişi

### Otomatik Veri Doğrulama modülü (feat/veri-dogrulama-modulu)
Üçüncü sayfa: `/veri-dogrulama`. Ham veriyi tanımlı bir şemaya göre doğrular. Saf istemci.

- `src/lib/validation/`
  - `types.ts` — `FieldRule` (type/required/unique/min/max/pattern/allowed/dateFormat/notFuture…),
    `Schema`, `ValidationIssue`, `ValidationReport`, `IssueCode`
  - `validators.ts` — `checkType` (öneri döndürür), `parseAnyDate` (→ ISO), `isValidTckn`
    (kontrol hanesi), `isValidIban` (mod-97), `isValidEmail`, `normalizePhone` (TR)
  - `infer.ts` — `inferFieldType` + `inferSchema` (sıfır-ayar başlangıç; baskın tarih
    formatını sabitler, anahtar kolonda ~benzersizlik, adet/miktar → min 0)
  - `presets.ts` — TCKN/IBAN/e-posta/telefon/tutar/ISO-tarih/anahtar/enum hazır kuralları
  - `validate.ts` — `validateDataset` (ana), `schemaToJson`/`schemaFromJson`, `validationReportToMarkdown`
- `src/components/validation/SchemaEditor.tsx` — kolon başına düzenlenebilir kural tablosu + preset uygula
- `src/components/validation/ValidationReportView.tsx` — özet, işaretli tablo (öneriler hücre içinde), bulgu listesi
- Auto-fix YOK — öneriler sadece gösterilir (`issue.suggestion`), veriye dokunulmaz
- `SiteNav`'a 3. sekme

### Açık tema + toggle (feat/acik-tema-toggle)
- **Varsayılan artık AÇIK tema** (`#f7f8fa` zemin). Header'da güneş/ay toggle'ı → koyu tema,
  `localStorage['reqtostory:theme']`'de saklanır, FOUC engelleyen inline script `<body>` başında.
- Tema `:root` (açık) / `:root[data-theme="dark"]` CSS değişkenleriyle; Tailwind v4
  `@custom-variant dark` tanımlı.
- Renkler artık semantik token: `bg-hover`, `text-ok/warn/err/info`, `bg-warn-bg/err-bg`,
  `ring-warn-line/err-line`, `text-kw-scenario/given/when/then`. Bileşenlerde ham
  `rose-*/amber-*/emerald-*/white/N` YOK — tema tek yerden (`globals.css`) değişir.

### Markdown önizleme (feat/markdown-onizleme)
- `react-markdown` + `remark-gfm`. Analiz çıktısında **kartlar ↔ markdown** segmentli geçişi
  (`OutputPanel` → `ResultView` / `CardsView` / `MarkdownPreview`).
- `MarkdownPreview`: `components` prop ile tüm elementler tema token'larıyla stillenir;
  ```gherkin bloklarında satır bazında anahtar kelime renklendirmesi (kartlardaki ile aynı).
- Kaynak: mevcut `toMarkdown(result)` — kopyala/indir ile birebir aynı çıktı.

### Kalanlar
- [ ] README ekran görüntüleri
- [ ] (Opsiyonel) Vercel deploy

---

## 11. Çalıştırma

```bash
npm install
cp .env.example .env.local     # GEMINI_API_KEY gir
npm run dev                     # http://localhost:3000
npm run build                   # prod build + tip kontrolü
npx eslint .                    # lint
```
