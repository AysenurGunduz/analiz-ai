/**
 * Analiz geçmişi — başarılı her analiz sonucu tarayıcıda (localStorage) saklanır.
 * Backend yok; sadece bu cihaz. Saf fonksiyonlar, SSR güvenli, private mode toleranslı.
 */
import type { InputState } from "@/components/InputPanel";
import type { AnalysisResult } from "@/lib/types";

const KEY = "reqtostory:analiz-history";
const LIMIT = 25;

export interface AnalizHistoryEntry {
  id: string;
  createdAt: number;
  title: string;
  storyCount: number;
  input: InputState;
  result: AnalysisResult;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function loadHistory(): AnalizHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is AnalizHistoryEntry =>
        !!e && typeof e === "object" && "id" in e && "result" in e && "input" in e,
    );
  } catch {
    return [];
  }
}

function persist(list: AnalizHistoryEntry[]): AnalizHistoryEntry[] {
  const trimmed = list.slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* kota dolu / private mode — sessiz geç */
  }
  return trimmed;
}

/** Sonucu geçmişe ekler. Aynı girdi metni varsa eski kaydı çıkarıp en üste taşır. */
export function saveToHistory(
  input: InputState,
  result: AnalysisResult,
): AnalizHistoryEntry[] {
  const key = input.rawText.trim();
  const rest = loadHistory().filter((e) => e.input.rawText.trim() !== key);
  const entry: AnalizHistoryEntry = {
    id: newId(),
    createdAt: Date.now(),
    title: result.title,
    storyCount: result.stories.length,
    input,
    result,
  };
  return persist([entry, ...rest]);
}

export function deleteHistoryEntry(id: string): AnalizHistoryEntry[] {
  return persist(loadHistory().filter((e) => e.id !== id));
}

export function clearHistory(): AnalizHistoryEntry[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* sessiz geç */
  }
  return [];
}

const REL_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function relativeTime(ts: number): string {
  const diff = ts - Date.now();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "az önce";
  const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });
  for (const [unit, ms] of REL_UNITS) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "az önce";
}
