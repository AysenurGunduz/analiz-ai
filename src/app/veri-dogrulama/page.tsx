"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Braces, Sparkles, Wand2, X } from "lucide-react";
import { SchemaEditor } from "@/components/validation/SchemaEditor";
import { ValidationReportView } from "@/components/validation/ValidationReportView";
import { parseDelimited, type ParsedTable } from "@/lib/query-check";
import {
  inferSchema,
  schemaFromJson,
  schemaToJson,
  validateDataset,
  type Schema,
  type ValidationReport,
} from "@/lib/validation";
import { VALIDATION_SAMPLES } from "@/lib/validation/samples";

type Delim = "auto" | ParsedTable["delimiter"];
const STORE = "pusula:veri-dogrulama";

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

const EMPTY_SCHEMA: Schema = { fields: [] };

export default function VeriDogrulamaPage() {
  const [data, setData] = useState("");
  const [delim, setDelim] = useState<Delim>("auto");
  const [schema, setSchema] = useState<Schema>(EMPTY_SCHEMA);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const parsed = useMemo(
    () => parseDelimited(data, delim === "auto" ? undefined : delim),
    [data, delim],
  );
  const columns = parsed.headers;
  const canRun = data.trim().length > 0;

  // geri yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) {
        const o = JSON.parse(saved) as { data?: string; delim?: Delim; schema?: Schema };
        /* eslint-disable react-hooks/set-state-in-effect */
        if (o.data) setData(o.data);
        if (o.delim) setDelim(o.delim);
        if (o.schema?.fields) setSchema(o.schema);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* yoksa boş */
    }
  }, []);

  useEffect(() => {
    try {
      if (data.trim()) localStorage.setItem(STORE, JSON.stringify({ data, delim, schema }));
      else localStorage.removeItem(STORE);
    } catch {
      /* private mode */
    }
  }, [data, delim, schema]);

  function infer() {
    setSchema(inferSchema(parseDelimited(data, delim === "auto" ? undefined : delim)));
  }

  function loadSample(s: (typeof VALIDATION_SAMPLES)[number]) {
    setData(s.data);
    setDelim("auto");
    setSchema(s.schema ?? inferSchema(parseDelimited(s.data)));
    setReport(null);
    setShowJson(false);
  }

  function run() {
    if (!canRun) return;
    setReport(
      validateDataset({
        data,
        schema: schema.fields.length ? schema : undefined,
        delimiter: delim === "auto" ? undefined : delim,
      }),
    );
  }

  function clearAll() {
    setData("");
    setSchema(EMPTY_SCHEMA);
    setDelim("auto");
    setReport(null);
    setShowJson(false);
  }

  function openJson() {
    setJsonText(schemaToJson(schema.fields.length ? schema : inferSchema(parsed)));
    setJsonError(null);
    setShowJson(true);
  }

  function importJson() {
    const res = schemaFromJson(jsonText);
    if ("error" in res) {
      setJsonError(res.error);
      return;
    }
    setSchema(res.schema);
    setJsonError(null);
    setShowJson(false);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Otomatik Veri Doğrulama</h1>
        <p className="mt-1.5 text-sm text-muted">
          Ham veriyi / SQL çıktısını tanımlı bir şemaya göre doğrular: eksik zorunlu alanlar,
          geçersiz tarih-sayı formatları, izin dışı değerler, TCKN/IBAN/e-posta kontrolü.
          Şema otomatik çıkarılır, elle düzenlenir, JSON olarak saklanır. Auto-fix yok —
          sadece öneri gösterilir. Tarayıcıda çalışır.
        </p>
      </div>

      {/* 01 — Veri */}
      <section className="mb-6">
        <StepLabel n="01" title="Veri" hint={columns.length ? `${columns.length} kolon` : "CSV / TSV yapıştır"} />
        <div className="surface rounded-xl p-4">
          <textarea
            value={data}
            onChange={(e) => setData(e.target.value)}
            placeholder={"musteri_no;tckn;eposta;bakiye;tarih\n1001;10000000146;ayse@ornek.com;1500,00;2026-01-03"}
            rows={7}
            spellCheck={false}
            className={`${fieldClass} resize-y font-mono`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px]">
              <span className="font-mono text-[11px] text-faint">ayraç</span>
              <select
                value={delim}
                onChange={(e) => setDelim(e.target.value as Delim)}
                className="rounded-md border border-line bg-inset px-2 py-1 text-[12px]"
              >
                <option value="auto">otomatik</option>
                <option value=";">;</option>
                <option value=",">,</option>
                <option value={"\t"}>TAB</option>
                <option value="|">|</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VALIDATION_SAMPLES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => loadSample(s)}
                  className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
                >
                  <Wand2 className="h-3 w-3" /> {s.label.replace("Örnek: ", "")}
                </button>
              ))}
            </div>
            {data && (
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
      </section>

      {/* 02 — Şema */}
      <section className="mb-6">
        <StepLabel n="02" title="Şema" hint={`${schema.fields.length} kural`} />
        <div className="surface rounded-xl p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={infer}
              disabled={!columns.length}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
            >
              <Sparkles className="h-3.5 w-3.5" /> Şemayı veriden çıkar
            </button>
            <button
              type="button"
              onClick={openJson}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[12px] text-muted transition hover:border-line-strong hover:text-ink"
            >
              <Braces className="h-3.5 w-3.5" /> JSON içe / dışa aktar
            </button>
          </div>

          {showJson && (
            <div className="mb-3 rounded-lg border border-line bg-inset p-3">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                spellCheck={false}
                className={`${fieldClass} resize-y font-mono text-[12px]`}
              />
              {jsonError && <p className="mt-1 text-[12px] text-err">{jsonError}</p>}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={importJson}
                  className="rounded-md bg-accent px-3 py-1 text-[12px] font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
                >
                  Şemayı yükle
                </button>
                <button
                  type="button"
                  onClick={() => setShowJson(false)}
                  className="rounded-md border border-line px-3 py-1 text-[12px] text-muted transition hover:text-ink"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {columns.length ? (
            <SchemaEditor columns={columns} schema={schema} onChange={setSchema} />
          ) : (
            <p className="text-[13px] text-faint">Önce veri yapıştır — kolonlar buradan düzenlenir.</p>
          )}
        </div>
      </section>

      {/* 03 — Doğrulama */}
      <section>
        <StepLabel
          n="03"
          title="Doğrulama"
          hint={report ? `${report.summary.errors} hata · ${report.summary.warnings} uyarı` : "rapor burada"}
        />
        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="mb-4 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Doğrula <ArrowRight className="h-4 w-4" />
        </button>
        <ValidationReportView
          report={report}
          data={data}
          delimiter={delim === "auto" ? undefined : delim}
        />
      </section>

      <footer className="mt-12 border-t border-line pt-5 text-center font-mono text-[11px] text-faint">
        saf istemci fonksiyonu · veri sunucuya gönderilmez
      </footer>
    </main>
  );
}
