"use client";

import { ArrowRight, Loader2, Wand2, X } from "lucide-react";
import {
  AUDIENCE_ROLES,
  PROJECT_TYPES,
  type AudienceRole,
  type ProjectType,
} from "@/lib/types";
import { SAMPLES } from "@/lib/samples";
import { RequirementHints } from "./RequirementHints";

const MIN_CHARS = 20;

export interface InputState {
  rawText: string;
  projectType: ProjectType | "";
  audienceRole: AudienceRole | "";
}

const fieldClass =
  "w-full min-w-0 rounded-lg border border-line bg-inset px-2.5 py-2 text-[13px] text-ink outline-none transition focus:border-line-strong";

export function InputPanel({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: InputState;
  onChange: (next: InputState) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const chars = value.rawText.trim().length;
  const tooShort = chars > 0 && chars < MIN_CHARS;
  const canSubmit = chars >= MIN_CHARS && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <textarea
          value={value.rawText}
          onChange={(e) => onChange({ ...value, rawText: e.target.value })}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Toplantı notu, e-posta talebi veya serbest gereksinim metnini yapıştır…"
          rows={11}
          className={`${fieldClass} resize-y leading-relaxed placeholder:text-faint`}
        />
        <div className="mt-1 flex items-center justify-between font-mono text-[11px]">
          <span className={tooShort ? "text-warn" : "text-faint"}>
            {tooShort ? `min ${MIN_CHARS} karakter (${chars})` : `${chars} karakter`}
          </span>
          {chars > 0 && (
            <button
              type="button"
              onClick={() => onChange({ rawText: "", projectType: "", audienceRole: "" })}
              className="inline-flex items-center gap-1 text-faint transition hover:text-ink"
            >
              <X className="h-3 w-3" /> temizle
            </button>
          )}
        </div>
      </div>

      <RequirementHints text={value.rawText} />

      <div className="grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] text-faint">proje tipi</span>
          <select
            value={value.projectType}
            onChange={(e) =>
              onChange({ ...value, projectType: e.target.value as ProjectType | "" })
            }
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
          <span className="mb-1 block font-mono text-[11px] text-faint">hedef rol</span>
          <select
            value={value.audienceRole}
            onChange={(e) =>
              onChange({ ...value, audienceRole: e.target.value as AudienceRole | "" })
            }
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
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() =>
                onChange({
                  rawText: s.rawText,
                  projectType: s.projectType ?? "",
                  audienceRole: s.audienceRole ?? "",
                })
              }
              className="rounded-md border border-line px-2 py-1 text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-35"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analiz ediliyor…
          </>
        ) : (
          <>
            Analiz Et <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
      <p className="-mt-1 text-center font-mono text-[10px] text-faint">⌘/Ctrl + Enter</p>
    </form>
  );
}
