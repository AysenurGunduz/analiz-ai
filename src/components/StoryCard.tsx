import { AlertTriangle, ListChecks, ScrollText } from "lucide-react";
import type { UserStory } from "@/lib/types";
import { cn } from "@/lib/cn";
import { storyToMarkdown } from "@/lib/export";
import { GherkinBlock } from "./GherkinBlock";
import { CopyButton } from "./CopyButton";

const PRIORITY_STYLE: Record<UserStory["priority"], string> = {
  Yüksek: "border-err-line bg-err-bg text-err",
  Orta: "border-warn-line bg-warn-bg text-warn",
  Düşük: "border-line-strong bg-hover text-muted",
};

function storyText(s: UserStory): string {
  return `As a ${s.role}\nI want ${s.feature}\nSo that ${s.benefit}`;
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof ListChecks;
  children: React.ReactNode;
}) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">
      <Icon className="h-3.5 w-3.5" /> {children}
    </h4>
  );
}

export function StoryCard({ story }: { story: UserStory }) {
  return (
    <article className="surface overflow-hidden rounded-xl">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-faint">{story.id}</span>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-medium",
                PRIORITY_STYLE[story.priority],
              )}
            >
              {story.priority}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold tracking-tight">{story.title}</h3>
        </div>
        <CopyButton getText={() => storyToMarkdown(story)} label="md" />
      </header>

      <div className="min-w-0 space-y-5 p-4">
        <div className="group relative surface-inset rounded-lg p-3 text-[13px] leading-relaxed">
          <div className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
            <CopyButton getText={() => storyText(story)} label="hikaye" />
          </div>
          <p>
            <span className="font-mono text-xs text-accent">As a</span>{" "}
            <span className="text-ink">{story.role}</span>
          </p>
          <p>
            <span className="font-mono text-xs text-accent">I want</span>{" "}
            <span className="text-ink">{story.feature}</span>
          </p>
          <p>
            <span className="font-mono text-xs text-accent">So that</span>{" "}
            <span className="text-ink">{story.benefit}</span>
          </p>
        </div>

        <section>
          <SectionTitle icon={ListChecks}>Kabul Kriterleri</SectionTitle>
          <div className="space-y-2">
            {story.acceptanceCriteria.map((s, i) => (
              <GherkinBlock key={i} scenario={s} />
            ))}
          </div>
        </section>

        {story.edgeCases.length > 0 && (
          <section>
            <SectionTitle icon={AlertTriangle}>Negatif / İstisnai Durumlar</SectionTitle>
            <ul className="space-y-1.5 text-[13px] text-muted">
              {story.edgeCases.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-err" />
                  {e}
                </li>
              ))}
            </ul>
          </section>
        )}

        {story.businessRules.length > 0 && (
          <section>
            <SectionTitle icon={ScrollText}>İş Kuralları</SectionTitle>
            <ul className="space-y-1.5 text-[13px] text-muted">
              {story.businessRules.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-kw-given" />
                  {r}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
