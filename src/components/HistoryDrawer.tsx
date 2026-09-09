"use client";

import { useEffect } from "react";
import { Clock, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { relativeTime, type AnalizHistoryEntry } from "@/lib/history";

export function HistoryDrawer({
  open,
  onClose,
  entries,
  activeId,
  onRestore,
  onDelete,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  entries: AnalizHistoryEntry[];
  activeId: string | null;
  onRestore: (entry: AnalizHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={cn("fixed inset-0 z-50", !open && "pointer-events-none")}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-scrim transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-line bg-bg shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Clock className="h-4 w-4 text-accent" /> Geçmiş
            <span className="font-mono text-[11px] text-faint">{entries.length}</span>
          </h2>
          <div className="flex items-center gap-1">
            {entries.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md px-2 py-1 font-mono text-[11px] text-faint transition hover:bg-hover hover:text-err"
              >
                tümünü sil
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="rounded-md p-1 text-muted transition hover:bg-hover hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <p className="mt-8 px-3 text-center text-[13px] leading-relaxed text-muted">
              Henüz kayıt yok. Yaptığın her analiz otomatik olarak buraya eklenir —
              yalnızca bu tarayıcıda saklanır.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((e) => (
                <li key={e.id}>
                  <div
                    className={cn(
                      "group rounded-lg border p-2.5 transition",
                      e.id === activeId
                        ? "border-line-strong bg-hover"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onRestore(e)}
                      className="block w-full text-left"
                    >
                      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
                        {e.title}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-faint">
                        {relativeTime(e.createdAt)} · {e.storyCount} hikaye
                        {e.input.projectType ? ` · ${e.input.projectType}` : ""}
                      </p>
                    </button>
                    <div className="mt-1.5 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onRestore(e)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-muted transition hover:text-accent"
                      >
                        <RotateCcw className="h-3 w-3" /> aç
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(e.id)}
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-muted transition hover:text-err"
                      >
                        <Trash2 className="h-3 w-3" /> sil
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
