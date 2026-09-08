"use client";

import { useState } from "react";
import { ArrowRight, Wand2, X } from "lucide-react";
import { QueryReport } from "@/components/QueryReport";
import { checkQueryOutput, type ParsedTable, type QueryCheckReport } from "@/lib/query-check";
import { QUERY_SAMPLES } from "@/lib/query-samples";

type Delim = "auto" | ParsedTable["delimiter"];

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

export default function SorguKontrolPage() {
  const [sql, setSql] = useState("");
  const [output, setOutput] = useState("");
  const [delim, setDelim] = useState<Delim>("auto");
  const [report, setReport] = useState<QueryCheckReport | null>(null);

  const canRun = output.trim().length > 0;

  function run() {
    if (!canRun) return;
    setReport(
      checkQueryOutput({
        output,
        sql: sql.trim() || undefined,
        delimiter: delim === "auto" ? undefined : delim,
      }),
    );
  }

  function clearAll() {
    setSql("");
    setOutput("");
    setDelim("auto");
    setReport(null);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-xl font-semibold tracking-tight">Sorgu çıktısı kontrolü</h1>
        <p className="mt-1.5 text-sm text-muted">
          Analistin çalıştırdığı sorgunun çıktısını yapıştır; boş sonuç kümesi,
          NULL/boş hücre, tip-format tutarsızlığı ve hata işaretçileri işaretlenir.
          Tarayıcıda çalışır, veri sunucuya gitmez.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="min-w-0 lg:sticky lg:top-[76px] lg:self-start">
          <StepLabel n="01" title="Girdi" />
          <div className="surface flex flex-col gap-4 rounded-xl p-4">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] text-faint">
                SQL sorgusu (opsiyonel)
              </span>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="SELECT ... FROM ... WHERE ..."
                rows={4}
                spellCheck={false}
                className={`${fieldClass} resize-y font-mono`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-mono text-[11px] text-faint">
                Sorgu çıktısı (CSV / TSV yapıştır)
              </span>
              <textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    run();
                  }
                }}
                placeholder={"id;ad;tutar\n1;Ayşe;1500,00\n2;;NULL"}
                rows={9}
                spellCheck={false}
                className={`${fieldClass} resize-y font-mono`}
              />
            </label>

            <label className="flex items-center gap-2 text-[13px]">
              <span className="font-mono text-[11px] text-faint">ayraç</span>
              <select
                value={delim}
                onChange={(e) => setDelim(e.target.value as Delim)}
                className={`${fieldClass} py-1`}
              >
                <option value="auto">otomatik</option>
                <option value=";">noktalı virgül ;</option>
                <option value=",">virgül ,</option>
                <option value={"\t"}>sekme (TAB)</option>
                <option value="|">dikey çizgi |</option>
              </select>
              {(sql || output) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-faint transition hover:text-ink"
                >
                  <X className="h-3 w-3" /> temizle
                </button>
              )}
            </label>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] text-faint">
                <Wand2 className="h-3 w-3" /> örnekler
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUERY_SAMPLES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setSql(s.sql);
                      setOutput(s.output);
                      setDelim("auto");
                      setReport(null);
                    }}
                    className="rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={run}
              disabled={!canRun}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-fg)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Kontrol Et <ArrowRight className="h-4 w-4" />
            </button>
            <p className="-mt-1 text-center font-mono text-[10px] text-faint">⌘/Ctrl + Enter</p>
          </div>
        </section>

        <section className="min-w-0">
          <StepLabel
            n="02"
            title="Rapor"
            hint={
              report
                ? `${report.summary.errors} hata · ${report.summary.warnings} uyarı`
                : "sonuç burada"
            }
          />
          <QueryReport report={report} />
        </section>
      </div>

      <footer className="mt-12 border-t border-line pt-5 text-center font-mono text-[11px] text-faint">
        saf istemci fonksiyonu · veri sunucuya gönderilmez
      </footer>
    </main>
  );
}
