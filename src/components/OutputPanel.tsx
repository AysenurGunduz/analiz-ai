"use client";

import { FileJson, FileText, HelpCircle, Lightbulb, Loader2, Terminal } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { downloadFile, toJira, toJson, toMarkdown } from "@/lib/export";
import { CopyButton } from "./CopyButton";
import { StoryCard } from "./StoryCard";

function SkeletonCard() {
  return (
    <div className="surface animate-pulse rounded-xl p-4">
      <div className="h-2.5 w-20 rounded bg-hover" />
      <div className="mt-2 h-4 w-2/3 rounded bg-hover" />
      <div className="mt-4 h-16 rounded bg-inset" />
      <div className="mt-3 h-20 rounded bg-inset" />
    </div>
  );
}

function DownloadBtn({ onClick, icon: Icon, children }: {
  onClick: () => void;
  icon: typeof FileText;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
    >
      <Icon className="h-3 w-3" /> {children}
    </button>
  );
}

export function OutputPanel({
  result,
  loading,
  error,
}: {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 font-mono text-xs text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> gemini analiz ediyor…
        </p>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-err-line bg-err-bg p-4 text-[13px] text-err">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-err">
          analiz başarısız
        </p>
        <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="surface flex min-h-[320px] flex-col items-center justify-center rounded-xl border-dashed p-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-faint">
          <Terminal className="h-5 w-5" />
        </span>
        <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted">
          Soldan metni gir ve <span className="text-ink">Analiz Et</span>&apos;e bas.
          Çıktı burada kart olarak görünür.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface rounded-xl p-4">
        <h2 className="text-base font-semibold tracking-tight">{result.title}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{result.summary}</p>

        <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line pt-3.5">
          <CopyButton getText={() => toMarkdown(result)} label="markdown" />
          <CopyButton getText={() => toJira(result)} label="jira" />
          <DownloadBtn
            onClick={() => downloadFile("reqtostory.md", toMarkdown(result), "text/markdown")}
            icon={FileText}
          >
            .md
          </DownloadBtn>
          <DownloadBtn
            onClick={() => downloadFile("reqtostory.json", toJson(result), "application/json")}
            icon={FileJson}
          >
            .json
          </DownloadBtn>
        </div>
      </div>

      {(result.assumptions.length > 0 || result.openQuestions.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.assumptions.length > 0 && (
            <div className="surface-inset rounded-xl p-3 text-[13px]">
              <h4 className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-warn">
                <Lightbulb className="h-3.5 w-3.5" /> Varsayımlar
              </h4>
              <ul className="list-disc space-y-1 pl-4 text-muted marker:text-warn">
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {result.openQuestions.length > 0 && (
            <div className="surface-inset rounded-xl p-3 text-[13px]">
              <h4 className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-kw-given">
                <HelpCircle className="h-3.5 w-3.5" /> Açık Sorular
              </h4>
              <ul className="list-disc space-y-1 pl-4 text-muted marker:text-kw-given">
                {result.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result.stories.map((s) => (
        <StoryCard key={s.id} story={s} />
      ))}
    </div>
  );
}
