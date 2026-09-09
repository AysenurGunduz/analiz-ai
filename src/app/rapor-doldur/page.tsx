"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Upload, Wand2, X } from "lucide-react";
import { ReportOutput } from "@/components/report/ReportOutput";
import { docxToMarkdown } from "@/lib/report/docx";
import { REPORT_SAMPLES } from "@/lib/report/samples";
import type { FillReportResponse, FillReportResult } from "@/lib/report/types";
import {
  AUDIENCE_ROLES,
  PROJECT_TYPES,
  type AudienceRole,
  type ProjectType,
} from "@/lib/types";

const STORE = "reqtostory:rapor-doldur";
const fieldClass =
  "w-full min-w-0 rounded-lg border border-line bg-inset px-2.5 py-2 text-[13px] text-ink outline-none transition focus:border-line-strong placeholder:text-faint";

function StepLabel({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="font-mono text-xs text-accent">{n}</span>
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {hint && <span className="text-xs text-faint">— {hint}</span>}
    </div>
  );
}

export default function RaporDoldurPage() {
  const [template, setTemplate] = useState("");
  const [notes, setNotes] = useState("");
  const [projectType, setProjectType] = useState<ProjectType | "">("");
  const [audienceRole, setAudienceRole] = useState<AudienceRole | "">("");
  const [result, setResult] = useState<FillReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileMsg, setFileMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canRun = template.trim().length >= 10 && notes.trim().length >= 20 && !loading;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) {
        const o = JSON.parse(saved) as { template?: string; notes?: string };
        /* eslint-disable react-hooks/set-state-in-effect */
        if (o.template) setTemplate(o.template);
        if (o.notes) setNotes(o.notes);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* yoksa boş */
    }
  }, []);

  useEffect(() => {
    try {
      if (template.trim() || notes.trim())
        localStorage.setItem(STORE, JSON.stringify({ template, notes }));
      else localStorage.removeItem(STORE);
    } catch {
      /* private mode */
    }
  }, [template, notes]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileMsg(null);
    try {
      if (/\.docx$/i.test(file.name)) {
        setFileMsg("dönüştürülüyor…");
        const md = await docxToMarkdown(file);
        setTemplate(md);
        setFileMsg(`${file.name} → markdown`);
      } else {
        const txt = await file.text();
        setTemplate(txt);
        setFileMsg(file.name);
      }
    } catch {
      setFileMsg("dosya okunamadı — .docx / .md / .txt deneyin");
    }
  }

  function loadSample(s: (typeof REPORT_SAMPLES)[number]) {
    setTemplate(s.template);
    setNotes(s.notes);
    setResult(null);
    setError(null);
    setFileMsg(null);
  }

  async function run() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/fill-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          notes,
          projectType: projectType || undefined,
          audienceRole: audienceRole || undefined,
        }),
      });
      const json = (await res.json()) as FillReportResponse;
      if (!json.ok) setError(json.error);
      else setResult(json.data);
    } catch {
      setError("Sunucuya ulaşılamadı. Ağ bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setTemplate("");
    setNotes("");
    setProjectType("");
    setAudienceRole("");
    setResult(null);
    setError(null);
    setFileMsg(null);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">Rapor Şablonu Doldurma</h1>
        <p className="mt-1.5 text-sm text-muted">
          Bir rapor şablonu (.docx / .md / metin) ve toplantı notlarını ver; sistem şablonun
          yapısını bozmadan başlık altlarını ve <code>{"{{...}}"}</code> alanlarını notlara göre
          doldurup geri versin. Uydurmaz — eksik bilgiyi işaretler.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6 lg:sticky lg:top-[76px] lg:self-start">
          {/* 01 Şablon */}
          <section>
            <StepLabel n="01" title="Rapor şablonu" hint={`${template.trim().length} karakter`} />
            <div className="surface flex flex-col gap-2 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted transition hover:border-line-strong hover:text-ink"
                >
                  <Upload className="h-3.5 w-3.5" /> Dosya yükle (.docx / .md / .txt)
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,.md,.markdown,.txt,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                {fileMsg && <span className="font-mono text-[11px] text-faint">{fileMsg}</span>}
              </div>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={"## Bölüm başlığı\n{{alan: açıklama}}\n\n## Diğer bölüm\n[doldurulacak]"}
                rows={10}
                spellCheck={false}
                className={`${fieldClass} resize-y font-mono`}
              />
            </div>
          </section>

          {/* 02 Notlar */}
          <section>
            <StepLabel n="02" title="Toplantı notları" hint={`${notes.trim().length} karakter`} />
            <div className="surface flex flex-col gap-3 rounded-xl p-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canRun) {
                    e.preventDefault();
                    run();
                  }
                }}
                placeholder="Toplantıdan aldığın tüm notları buraya yapıştır (birden fazla toplantı olabilir)…"
                rows={10}
                spellCheck={false}
                className={`${fieldClass} resize-y`}
              />
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block font-mono text-[11px] text-faint">proje tipi</span>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value as ProjectType | "")}
                    className={fieldClass}
                  >
                    <option value="">—</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-mono text-[11px] text-faint">hedef okuyucu</span>
                  <select
                    value={audienceRole}
                    onChange={(e) => setAudienceRole(e.target.value as AudienceRole | "")}
                    className={fieldClass}
                  >
                    <option value="">—</option>
                    {AUDIENCE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] text-faint">
                  <Wand2 className="h-3 w-3" /> örnekler
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REPORT_SAMPLES.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => loadSample(s)}
                      className="rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
                    >
                      {s.label.replace("Örnek: ", "")}
                    </button>
                  ))}
                  {(template || notes) && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-faint transition hover:text-ink"
                    >
                      <X className="h-3 w-3" /> temizle
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={run}
                disabled={!canRun}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Dolduruluyor…
                  </>
                ) : (
                  <>
                    Raporu Doldur <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="-mt-1 text-center font-mono text-[10px] text-faint">⌘/Ctrl + Enter</p>
            </div>
          </section>
        </div>

        <section className="min-w-0">
          <StepLabel
            n="03"
            title="Doldurulmuş rapor"
            hint={
              result
                ? `${result.coverage.filter((c) => c.status === "bilgi_yok").length} eksik alan`
                : "sonuç burada"
            }
          />
          <ReportOutput result={result} loading={loading} error={error} />
        </section>
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-center font-mono text-[11px] text-faint">
        şablon + notlar → Gemini · dosya dönüşümü tarayıcıda
      </footer>
    </main>
  );
}
