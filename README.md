# ReqToStory · AI Destekli İş Analizi ve Gereksinim Asistanı

Üç modüllü hafif iç araç:

1. **Analiz** (`/`) — Ham müşteri taleplerini, toplantı notlarını veya serbest biçimli
   gereksinimleri **Kullanıcı Hikayeleri**, **Gherkin (Given-When-Then) kabul kriterleri**,
   **edge case'ler** ve **iş kurallarına** dönüştürür (Gemini). Yapılan her analiz
   tarayıcıya kaydedilir — sayfadaki **Geçmiş** panelinden geri açılır (yalnızca bu cihaz).
2. **Sorgu Kontrolü** (`/sorgu-kontrol`) — Analistin çalıştırdığı SQL sorgusunun çıktısını
   (CSV/TSV) alır; boş sonuç kümesi, NULL/boş hücre, tip-format tutarsızlığı ve hata
   işaretçilerini renklendirerek işaretler. Tamamen istemci tarafında, saf fonksiyon.
3. **Veri Doğrulama** (`/veri-dogrulama`) — Ham veriyi tanımlı bir **şemaya** göre doğrular:
   zorunlu alanlar, tip/format, tarih formatı, izinli değerler (enum), min/max, regex,
   benzersizlik + hazır **TCKN / IBAN / e-posta / telefon** doğrulayıcıları. Şema otomatik
   çıkarılır, elle düzenlenir, JSON olarak dışa/içe aktarılır. Auto-fix yok — sadece öneri.
4. **Rapor Doldur** (`/rapor-doldur`) — Bir rapor şablonu (**.docx** / .md / metin) + toplantı
   notları ver; sistem şablonun yapısını bozmadan başlık altlarını ve `{{...}}` alanlarını
   notlara göre doldurur. Çıktı: markdown önizleme + düzenleme + **.docx / .md** indirme,
   bölüm bazlı kapsama tablosu, takip soruları. Eksik bilgiyi uydurmaz, işaretler.

## Teknoloji

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Google Gemini (`@google/genai`) — yapısal JSON çıktı (`responseSchema`); `mammoth` + `turndown` (.docx→md), `docx` (md→.docx)
- Zod ile hem istek hem de model çıktısı doğrulama
- lucide-react ikonlar · react-markdown (Markdown önizleme)
- Açık / koyu tema (header'da toggle, `localStorage`)

## Kurulum

```bash
npm install
cp .env.example .env.local   # GEMINI_API_KEY değerini girin
npm run dev
```

API anahtarı: <https://aistudio.google.com/app/apikey>

Ayrıntılı implementation notları: [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)

## Mimari

| Katman | Dosya | Sorumluluk |
| --- | --- | --- |
| Şema / tipler | `src/lib/types.ts` | Zod şemaları + türetilen TS tipleri (tek doğruluk kaynağı) |
| Prompt | `src/lib/prompt.ts` | Sistem prompt'u + kullanıcı prompt'u üretici |
| LLM istemcisi | `src/lib/gemini.ts` | Gemini çağrısı, `responseSchema`, JSON parse + Zod doğrulama |
| API | `src/app/api/generate/route.ts` | POST endpoint, istek doğrulama, hata yönetimi |
| Export | `src/lib/export.ts` | Markdown / Jira / JSON dönüştürme + indirme |
| Örnekler | `src/lib/samples.ts` | Hızlı test senaryoları |
| UI (analiz) | `src/app/page.tsx`, `src/components/*` | Sol girdi paneli / sağ çıktı kartları |
| Sorgu kontrolü | `src/lib/query-check.ts` | Ayrıştırıcı + kontrol fonksiyonu (parser, tip çıkarımı, SQL lint) |
| Sorgu UI | `src/app/sorgu-kontrol/page.tsx`, `src/components/QueryReport.tsx` | Girdi + işaretli tablo + bulgu raporu |
| Veri doğrulama | `src/lib/validation/` | `validators` (tip/TCKN/IBAN/…), `infer` (şema çıkarımı), `presets`, `validate` (ana fonksiyon + JSON I/O) |
| Doğrulama UI | `src/app/veri-dogrulama/page.tsx`, `src/components/validation/*` | Veri + şema editörü + işaretli tablo + öneriler |

## Çıktı formatı

```
AnalysisResult
├── title, summary
├── assumptions[]        (varsayımlar)
├── openQuestions[]      (müşteriye sorulacaklar)
└── stories[]
    ├── id, title, priority
    ├── role / feature / benefit   (As a / I want / So that)
    ├── acceptanceCriteria[]       (Gherkin: name, given[], when[], then[])
    ├── edgeCases[]
    └── businessRules[]
```

## Dışa aktarma

- Panoya kopyala: Markdown veya Jira wiki markup
- İndir: `.md` veya `.json`
