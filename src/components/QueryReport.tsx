"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Inbox,
  XCircle,
} from "lucide-react";
import {
  KIND_LABEL,
  flagAt,
  reportToMarkdown,
  type QueryCheckReport,
  type Severity,
} from "@/lib/query-check";
import { cn } from "@/lib/cn";
import { CopyButton } from "./CopyButton";

const SEV_CELL: Record<Severity, string> = {
  error: "bg-err-bg text-err ring-1 ring-inset ring-err-line",
  warning: "bg-warn-bg text-warn ring-1 ring-inset ring-warn-line",
  info: "bg-hover text-faint",
};

const SEV_DOT: Record<Severity, string> = {
  error: "bg-err",
  warning: "bg-warn",
  info: "bg-info",
};

function Chip({ label, value, tone }: { label: string; value: number | string; tone?: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[11px] text-muted">
      {tone && <span className={cn("h-1.5 w-1.5 rounded-full", SEV_DOT[tone])} />}
      {label}: <span className="text-ink">{value}</span>
    </span>
  );
}

export function QueryReport({ report }: { report: QueryCheckReport | null }) {
  if (!report) {
    return (
      <div className="surface flex min-h-[300px] flex-col items-center justify-center rounded-xl border-dashed p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-faint">
          <Database className="h-5 w-5" />
        </span>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
          Sorgu çıktısını (CSV/TSV) yapıştır ve <span className="text-ink">Kontrol Et</span>
          &apos;e bas. Boş / hatalı kayıtlar burada işaretlenir.
        </p>
      </div>
    );
  }

  const { table, flags, columns, sqlWarnings, summary, emptyResult } = report;

  return (
    <div className="space-y-4">
      {/* Özet */}
      <div className="surface rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip label="satır" value={report.rowCount} />
          <Chip label="kolon" value={report.colCount} />
          <Chip
            label="ayraç"
            value={table.delimiter === "\t" ? "TAB" : table.delimiter}
          />
          <Chip label="hata" value={summary.errors} tone={summary.errors ? "error" : undefined} />
          <Chip
            label="uyarı"
            value={summary.warnings}
            tone={summary.warnings ? "warning" : undefined}
          />
          <span className="ml-auto">
            <CopyButton getText={() => reportToMarkdown(report)} label="rapor" />
          </span>
        </div>

        <p className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[13px]">
          {emptyResult ? (
            <>
              <Inbox className="h-4 w-4 text-warn" />
              <span className="text-warn">Sorgu boş sonuç kümesi döndürdü.</span>
            </>
          ) : summary.errors > 0 ? (
            <>
              <XCircle className="h-4 w-4 text-err" />
              <span className="text-err">
                {summary.errors} hata, {summary.affectedRows} satırda sorun bulundu.
              </span>
            </>
          ) : summary.warnings > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-warn" />
              <span className="text-warn">
                {summary.warnings} uyarı var — kontrol edilmesi öneriliyor.
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-ok" />
              <span className="text-ok">Belirgin bir sorun bulunamadı.</span>
            </>
          )}
        </p>
      </div>

      {/* Boş sonuç kümesi */}
      {emptyResult && (
        <div className="flex items-start gap-3 rounded-xl border border-warn-line bg-warn-bg p-4 text-[13px] text-warn">
          <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          <div>
            <p className="font-semibold">Boş sonuç kümesi</p>
            <p className="mt-1 opacity-90">
              Sorgu hiç kayıt döndürmedi. WHERE koşulları, tarih aralığı veya JOIN
              eşleşmelerini kontrol edin; beklenen buysa yok sayabilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* SQL uyarıları */}
      {sqlWarnings.length > 0 && (
        <div className="surface-inset rounded-xl p-3">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            SQL uyarıları
          </h4>
          <ul className="space-y-1.5 text-[13px]">
            {sqlWarnings.map((w, i) => (
              <li key={i} className="flex gap-2 text-muted">
                <span
                  className={cn(
                    "mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full",
                    SEV_DOT[w.severity],
                  )}
                />
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tablo */}
      {table.rows.length > 0 && (
        <div className="surface overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line bg-inset">
                  <th className="px-2 py-1.5 text-right font-mono text-[10px] text-faint">#</th>
                  {table.headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-3 py-1.5 text-left font-medium text-muted"
                      title={`tip: ${columns[i]?.type}`}
                    >
                      {h}
                      <span className="ml-1 font-mono text-[10px] text-faint">
                        {columns[i]?.type}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r} className="border-b border-line/60 last:border-0">
                    <td className="px-2 py-1 text-right font-mono text-[10px] text-faint">
                      {r + 1}
                    </td>
                    {table.headers.map((_, c) => {
                      const f = flagAt(flags, r, c);
                      const raw = row[c] ?? "";
                      return (
                        <td
                          key={c}
                          title={f?.message}
                          className={cn(
                            "px-3 py-1 align-top font-mono",
                            f ? `rounded ${SEV_CELL[f.severity]}` : "text-muted",
                          )}
                        >
                          {raw === "" ? (
                            <span className="text-faint italic">∅</span>
                          ) : (
                            raw
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulgu listesi */}
      {flags.length > 0 && (
        <div className="surface rounded-xl p-4">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            hücre bulguları ({flags.length})
          </h4>
          <ul className="space-y-1.5 text-[13px]">
            {flags.map((f, i) => (
              <li key={i} className="flex gap-2 text-muted">
                <span
                  className={cn(
                    "mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full",
                    SEV_DOT[f.severity],
                  )}
                />
                <span>
                  <span className="text-ink">
                    Satır {f.row + 1} · {table.headers[f.col]}
                  </span>{" "}
                  <span className="font-mono text-[11px] text-faint">
                    [{KIND_LABEL[f.kind]}]
                  </span>{" "}
                  {f.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Açıklama */}
      <div className="flex flex-wrap gap-3 px-1 font-mono text-[11px] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-err-bg ring-1 ring-inset ring-err-line" />
          hata
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-warn-bg ring-1 ring-inset ring-warn-line" />
          uyarı
        </span>
        <span>∅ = boş hücre</span>
      </div>
    </div>
  );
}
