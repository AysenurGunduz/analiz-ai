"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Inbox, ShieldCheck, XCircle } from "lucide-react";
import {
  ISSUE_LABELS,
  validationReportToMarkdown,
  type Severity,
  type ValidationIssue,
  type ValidationReport,
} from "@/lib/validation";
import { parseDelimited } from "@/lib/query-check";
import { cn } from "@/lib/cn";
import { CopyButton } from "../CopyButton";

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

function issueAt(issues: ValidationIssue[], row: number, col: number) {
  const rank: Record<Severity, number> = { error: 3, warning: 2, info: 1 };
  return issues
    .filter((i) => i.row === row && i.columnIndex === col)
    .sort((a, b) => rank[b.severity] - rank[a.severity])[0];
}

function Chip({ label, value, tone }: { label: string; value: number | string; tone?: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[11px] text-muted">
      {tone && <span className={cn("h-1.5 w-1.5 rounded-full", SEV_DOT[tone])} />}
      {label}: <span className="text-ink">{value}</span>
    </span>
  );
}

export function ValidationReportView({
  report,
  data,
  delimiter,
}: {
  report: ValidationReport | null;
  data: string;
  delimiter?: "," | ";" | "\t" | "|";
}) {
  if (!report) {
    return (
      <div className="surface flex min-h-[280px] flex-col items-center justify-center rounded-xl border-dashed p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-faint">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
          Veriyi yapıştır, şemayı düzenle ve <span className="text-ink">Doğrula</span>&apos;ya
          bas. Bulgular burada listelenir.
        </p>
      </div>
    );
  }

  const table = parseDelimited(data, delimiter);
  const { summary, issues, emptyResult } = report;
  const rowLevel = issues.filter((i) => i.row < 0);

  return (
    <div className="space-y-4">
      <div className="surface rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip label="satır" value={report.rowCount} />
          <Chip label="temiz" value={summary.cleanRows} tone={summary.cleanRows ? "info" : undefined} />
          <Chip label="hata" value={summary.errors} tone={summary.errors ? "error" : undefined} />
          <Chip label="uyarı" value={summary.warnings} tone={summary.warnings ? "warning" : undefined} />
          <span className="ml-auto">
            <CopyButton getText={() => validationReportToMarkdown(report)} label="rapor" />
          </span>
        </div>
        <p className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[13px]">
          {emptyResult ? (
            <>
              <Inbox className="h-4 w-4 text-warn" />
              <span className="text-warn">Boş veri kümesi.</span>
            </>
          ) : summary.errors > 0 ? (
            <>
              <XCircle className="h-4 w-4 text-err" />
              <span className="text-err">
                {summary.errors} hata · {summary.affectedRows}/{report.rowCount} satır sorunlu.
              </span>
            </>
          ) : summary.warnings > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-warn" />
              <span className="text-warn">{summary.warnings} uyarı — kontrol önerilir.</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-ok" />
              <span className="text-ok">Şemaya göre tüm satırlar geçerli.</span>
            </>
          )}
        </p>
      </div>

      {rowLevel.length > 0 && (
        <div className="surface-inset rounded-xl p-3">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            şema / kolon uyarıları
          </h4>
          <ul className="space-y-1.5 text-[13px]">
            {rowLevel.map((i, k) => (
              <li key={k} className="flex gap-2 text-muted">
                <span className={cn("mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full", SEV_DOT[i.severity])} />
                {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {table.rows.length > 0 && (
        <div className="surface overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line bg-inset">
                  <th className="px-2 py-1.5 text-right font-mono text-[10px] text-faint">#</th>
                  {table.headers.map((h, i) => (
                    <th key={i} className="px-3 py-1.5 text-left font-medium text-muted">
                      {h}
                      <span className="ml-1 font-mono text-[10px] text-faint">
                        {report.columns[i]?.ruleType ?? report.columns[i]?.inferredType}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, r) => (
                  <tr key={r} className="border-b border-line/60 last:border-0">
                    <td className="px-2 py-1 text-right font-mono text-[10px] text-faint">{r + 1}</td>
                    {table.headers.map((_, c) => {
                      const f = issueAt(issues, r, c);
                      const raw = row[c] ?? "";
                      return (
                        <td
                          key={c}
                          title={f ? `${f.message}${f.suggestion ? ` → ${f.suggestion}` : ""}` : undefined}
                          className={cn(
                            "px-3 py-1 align-top font-mono",
                            f ? `rounded ${SEV_CELL[f.severity]}` : "text-muted",
                          )}
                        >
                          {raw === "" ? <span className="text-faint italic">∅</span> : raw}
                          {f?.suggestion && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-ok">
                              <ArrowRight className="h-2.5 w-2.5" />
                              {f.suggestion}
                            </span>
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

      {issues.filter((i) => i.row >= 0).length > 0 && (
        <div className="surface rounded-xl p-4">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            bulgular ({issues.filter((i) => i.row >= 0).length})
          </h4>
          <ul className="space-y-1.5 text-[13px]">
            {issues
              .filter((i) => i.row >= 0)
              .map((i, k) => (
                <li key={k} className="flex gap-2 text-muted">
                  <span className={cn("mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full", SEV_DOT[i.severity])} />
                  <span>
                    <span className="text-ink">
                      Satır {i.row + 1} · {i.column}
                    </span>{" "}
                    <span className="font-mono text-[11px] text-faint">[{ISSUE_LABELS[i.code]}]</span>{" "}
                    {i.message}
                    {i.suggestion && (
                      <span className="text-ok"> → öneri: {i.suggestion}</span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 px-1 font-mono text-[11px] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-err-bg ring-1 ring-inset ring-err-line" /> hata
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-warn-bg ring-1 ring-inset ring-warn-line" /> uyarı
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3 text-ok" /> öneri (uygulanmaz)
        </span>
      </div>
    </div>
  );
}
