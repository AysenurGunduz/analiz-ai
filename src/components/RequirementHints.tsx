"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  LINT_CATEGORY_LABELS,
  lintRequirement,
  summarizeLint,
} from "@/lib/requirement-lint";

export function RequirementHints({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const findings = useMemo(() => lintRequirement(text), [text]);
  const summary = useMemo(() => summarizeLint(findings), [findings]);

  if (text.trim().length < 20) return null;

  if (findings.length === 0) {
    return (
      <p className="flex items-center gap-1.5 font-mono text-[11px] text-ok">
        <Check className="h-3 w-3" /> belirgin bir belirsizlik yok
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-warn-line bg-warn-bg/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left font-mono text-[11px] text-warn"
      >
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span className="font-semibold">{summary.total} belirsiz ifade</span>
        <span className="min-w-0 flex-1 truncate text-warn/80">
          {summary.byCategory
            .map((c) => `${LINT_CATEGORY_LABELS[c.category].toLowerCase()} ·${c.count}`)
            .join("  ")}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul className="space-y-1 border-t border-warn-line px-2.5 py-2 text-[12px] text-muted">
          {findings.map((f, i) => (
            <li key={`${f.index}-${i}`} className="leading-snug">
              <span className="rounded bg-warn-bg px-1 font-mono text-[11px] text-warn ring-1 ring-warn-line">
                {f.match}
              </span>{" "}
              <span className="text-faint">
                — {LINT_CATEGORY_LABELS[f.category]}: {f.hint}
              </span>
            </li>
          ))}
          <li className="pt-1 font-mono text-[10px] text-faint">
            İpucu: bunları düzeltmeden analiz edebilirsin — model yine de
            varsayım/açık soru olarak işaretler.
          </li>
        </ul>
      )}
    </div>
  );
}
