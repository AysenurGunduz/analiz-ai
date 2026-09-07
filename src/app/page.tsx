"use client";

import { useEffect, useState } from "react";
import { InputPanel, type InputState } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { DEMO_RESULT } from "@/lib/demo";
import type { AnalysisResult, GenerateResponse } from "@/lib/types";

const EMPTY: InputState = { rawText: "", projectType: "", audienceRole: "" };
const DRAFT_KEY = "reqtostory:draft";

function StepLabel({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="font-mono text-xs text-accent">{n}</span>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {hint && <span className="text-xs text-faint">— {hint}</span>}
    </div>
  );
}

export default function Page() {
  const [input, setInput] = useState<InputState>(EMPTY);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?demo=1 → örnek çıktı; ayrıca son taslağı localStorage'dan geri yükle.
  // Tarayıcıya özel değerler olduğu için mount sonrası okunur (SSR'da yok).
  useEffect(() => {
    const isDemo =
      new URLSearchParams(window.location.search).get("demo") === "1";
    let draft: InputState | null = null;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) draft = { ...EMPTY, ...(JSON.parse(saved) as Partial<InputState>) };
    } catch {
      /* private mode vb. */
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isDemo) setResult(DEMO_RESULT);
    if (draft) setInput(draft);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    try {
      if (input.rawText.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify(input));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* private mode vb. */
    }
  }, [input]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: input.rawText,
          projectType: input.projectType || undefined,
          audienceRole: input.audienceRole || undefined,
        }),
      });
      const json = (await res.json()) as GenerateResponse;
      if (!json.ok) setError(json.error);
      else setResult(json.data);
    } catch {
      setError("Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">
          Dağınık gereksinimleri analiz çıktısına çevir
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Toplantı notu, e-posta veya serbest metni yapıştır; standart User Story,
          Gherkin kabul kriterleri, edge case ve iş kurallarını al.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="min-w-0 lg:sticky lg:top-[76px] lg:self-start">
          <StepLabel n="01" title="Girdi" />
          <div className="surface rounded-xl p-4">
            <InputPanel
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </div>
        </section>

        <section className="min-w-0">
          <StepLabel
            n="02"
            title="Analiz"
            hint={result ? `${result.stories.length} hikaye` : "çıktı burada"}
          />
          <OutputPanel result={result} loading={loading} error={error} />
        </section>
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-center font-mono text-[11px] text-faint">
        Next.js · Gemini · çıktı Zod ile doğrulanır
      </footer>
    </main>
  );
}
