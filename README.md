# ReqToStory · AI Destekli İş Analizi ve Gereksinim Asistanı

Ham müşteri taleplerini, toplantı notlarını veya serbest biçimli gereksinimleri
**Kullanıcı Hikayeleri**, **Gherkin (Given-When-Then) kabul kriterleri**, **edge case'ler**
ve **iş kurallarına** dönüştüren hafif iç araç.

## Teknoloji

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Google Gemini (`@google/genai`) — yapısal JSON çıktı (`responseSchema`)
- Zod ile hem istek hem de model çıktısı doğrulama
- lucide-react ikonlar

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
| UI | `src/app/page.tsx`, `src/components/*` | Sol girdi paneli / sağ çıktı kartları |

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
