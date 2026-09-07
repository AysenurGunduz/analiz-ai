import type { GherkinScenario } from "@/lib/types";
import { CopyButton } from "./CopyButton";

const KEYWORD_CLASS: Record<string, string> = {
  Scenario: "text-violet-400",
  Given: "text-sky-400",
  When: "text-amber-400",
  Then: "text-emerald-400",
  And: "text-faint",
};

function toLines(s: GherkinScenario): Array<{ kw: string; text: string }> {
  const rows: Array<{ kw: string; text: string }> = [{ kw: "Scenario", text: s.name }];
  s.given.forEach((g, i) => rows.push({ kw: i === 0 ? "Given" : "And", text: g }));
  s.when.forEach((w, i) => rows.push({ kw: i === 0 ? "When" : "And", text: w }));
  s.then.forEach((t, i) => rows.push({ kw: i === 0 ? "Then" : "And", text: t }));
  return rows;
}

export function scenarioToText(s: GherkinScenario): string {
  return toLines(s)
    .map((r) => (r.kw === "Scenario" ? `Scenario: ${r.text}` : `  ${r.kw} ${r.text}`))
    .join("\n");
}

export function GherkinBlock({ scenario }: { scenario: GherkinScenario }) {
  const lines = toLines(scenario);
  return (
    <div className="group relative surface-inset overflow-hidden rounded-lg">
      <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover:opacity-100">
        <CopyButton getText={() => scenarioToText(scenario)} label="senaryo" />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-[1.7]">
        {lines.map((r, i) => (
          <div key={i} className={r.kw === "Scenario" ? "" : "pl-4"}>
            <span className={`font-medium ${KEYWORD_CLASS[r.kw] ?? ""}`}>
              {r.kw}
              {r.kw === "Scenario" ? ":" : ""}
            </span>{" "}
            <span className="text-muted">{r.text}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
