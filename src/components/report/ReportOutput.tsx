"use client";

import { useEffect, useState } from "react";
import {
  AlignLeft,
  CircleHelp,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Loader2,
} from "lucide-react";
import type { CoverageStatus, FillReportResult } from "@/lib/report/types";
import { markdownToDocxBlob } from "@/lib/report/docx";
import { downloadFile } from "@/lib/export";
import { cn } from "@/lib/cn";
import { CopyButton } from "../CopyButton";
import { MarkdownPreview } from "../MarkdownPreview";

const STATUS_STYLE: Record<CoverageStatus, string> = {
  dolduruldu: "text-ok",
  kısmen: "text-warn",
  bilgi_yok: "text-err",
};
const STATUS_DOT: Record<CoverageStatus, string> = {
  dolduruldu: "bg-ok",
  kısmen: "bg-warn",
  bilgi_yok: "bg-err",
};
const STATUS_LABEL: Record<CoverageStatus, string> = {
  dolduruldu: "dolduruldu",
  kısmen: "kısmen",
  bilgi_yok: "bilgi yok",
};

function SkeletonReport() {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-mono text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> gemini şablonu dolduruyor…
      </p>
      <div className="surface animate-pulse space-y-3 rounded-xl p-5">
        <div className="h-4 w-1/3 rounded bg-hover" />
        <div className="h-3 w-full rounded bg-inset" />
        <div className="h-3 w-5/6 rounded bg-inset" />
        <div className="mt-4 h-4 w-1/4 rounded bg-hover" />
        <div className="h-3 w-full rounded bg-inset" />
      </div>
    </div>
  );
}

export function ReportOutput({
  result,
  loading,
  error,
  fileBase = "rapor",
}: {
  result: FillReportResult | null;
  loading: boolean;
  error: string | null;
  fileBase?: string;
}) {
  const [text, setText] = useState("");
  const [view, setView] = useState<"preview" | "edit">("preview");
  const [docxBusy, setDocxBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (result) setText(result.filledReport);
  }, [result]);

  if (loading) return <SkeletonReport />;

  if (error) {
    return (
      <div className="rounded-xl border border-err-line bg-err-bg p-4 text-[13px] text-err">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider">doldurma başarısız</p>
        <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="surface flex min-h-[280px] flex-col items-center justify-center rounded-xl border-dashed p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-faint">
          <FileText className="h-5 w-5" />
        </span>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
          Şablonu ve toplantı notlarını gir, <span className="text-ink">Raporu Doldur</span>&apos;a
          bas. Doldurulmuş rapor burada — önizle, düzenle, indir.
        </p>
      </div>
    );
  }

  const counts = result.coverage.reduce(
    (a, c) => ((a[c.status] = (a[c.status] ?? 0) + 1), a),
    {} as Record<CoverageStatus, number>,
  );

  async function downloadDocx() {
    setDocxBusy(true);
    try {
      const blob = await markdownToDocxBlob(text, fileBase);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDocxBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Özet + kapsama */}
      <div className="surface rounded-xl p-4">
        <p className="text-[13px] text-muted">{result.usedNotesSummary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {(["dolduruldu", "kısmen", "bilgi_yok"] as const).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1 font-mono text-[11px] text-muted"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />
              {STATUS_LABEL[s]}: <span className="text-ink">{counts[s] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Doldurulmuş rapor */}
      <div className="surface rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line p-3">
          <div className="mr-1 inline-flex rounded-md border border-line p-0.5">
            {(["preview", "edit"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] transition",
                  view === v ? "bg-hover text-ink" : "text-muted hover:text-ink",
                )}
              >
                {v === "preview" ? <Eye className="h-3 w-3" /> : <AlignLeft className="h-3 w-3" />}
                {v === "preview" ? "önizleme" : "düzenle"}
              </button>
            ))}
          </div>
          <CopyButton getText={() => text} label="kopyala" />
          <button
            type="button"
            onClick={() => downloadFile(`${fileBase}.md`, text, "text/markdown")}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
          >
            <FileText className="h-3 w-3" /> .md
          </button>
          <button
            type="button"
            onClick={downloadDocx}
            disabled={docxBusy}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
          >
            {docxBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            .docx
          </button>
          {text !== result.filledReport && (
            <button
              type="button"
              onClick={() => setText(result.filledReport)}
              className="font-mono text-[11px] text-faint transition hover:text-ink"
            >
              düzenlemeyi geri al
            </button>
          )}
        </div>

        {view === "preview" ? (
          <div className="p-1">
            <MarkdownPreview markdown={text} />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={24}
            className="w-full resize-y rounded-b-xl border-0 bg-inset p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none"
          />
        )}
      </div>

      {/* Kapsama tablosu */}
      {result.coverage.length > 0 && (
        <div className="surface overflow-hidden rounded-xl">
          <h4 className="border-b border-line px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-faint">
            kapsama
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <tbody>
                {result.coverage.map((c, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-1.5 font-medium text-ink">{c.section}</td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px]", STATUS_STYLE[c.status])}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[c.status])} />
                        {STATUS_LABEL[c.status]}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Takip soruları */}
      {result.followUps.length > 0 && (
        <div className="surface-inset rounded-xl p-3">
          <h4 className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-kw-given">
            <HelpCircle className="h-3.5 w-3.5" /> Takip Soruları
          </h4>
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-muted marker:text-kw-given">
            {result.followUps.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-center gap-1.5 px-1 font-mono text-[11px] text-faint">
        <CircleHelp className="h-3 w-3" />
        &quot;_(notlarda belirtilmemiş)_&quot; işaretli alanları notlarla tamamlayıp yeniden çalıştır.
      </p>
    </div>
  );
}
