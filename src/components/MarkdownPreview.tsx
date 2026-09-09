"use client";

import type { ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GHERKIN_KW = /^(\s*)(Scenario:|Given|When|Then|And|But)\b/;
const KW_CLASS: Record<string, string> = {
  "Scenario:": "text-kw-scenario",
  Given: "text-kw-given",
  When: "text-kw-when",
  Then: "text-kw-then",
  And: "text-faint",
  But: "text-faint",
};

/** ```gherkin bloklarını satır satır renklendirir; diğer kod bloklarını düz gösterir. */
function highlightCode(text: string, lang: string | undefined) {
  if (lang !== "gherkin") return text;
  return text.split("\n").map((line, i) => {
    const m = line.match(GHERKIN_KW);
    if (!m) {
      return (
        <div key={i} className="text-muted">
          {line || " "}
        </div>
      );
    }
    const [, indent, kw] = m;
    return (
      <div key={i}>
        <span className="text-faint">{indent}</span>
        <span className={`font-medium ${KW_CLASS[kw] ?? ""}`}>{kw}</span>
        <span className="text-muted">{line.slice(m[0].length)}</span>
      </div>
    );
  });
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <div className="surface rounded-xl p-5 text-[13px] leading-relaxed text-ink">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mt-0 mb-3 text-lg font-semibold tracking-tight" {...p} />,
          h2: (p) => (
            <h2
              className="mt-6 mb-2 border-b border-line pb-1 text-sm font-semibold uppercase tracking-wider text-muted"
              {...p}
            />
          ),
          h3: (p) => <h3 className="mt-5 mb-1.5 text-[13px] font-semibold" {...p} />,
          p: (p) => <p className="my-2 text-muted" {...p} />,
          ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-faint" {...p} />,
          ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-faint" {...p} />,
          li: (p) => <li className="text-muted" {...p} />,
          strong: (p) => <strong className="font-semibold text-ink" {...p} />,
          a: (p) => <a className="text-accent underline underline-offset-2" {...p} />,
          hr: () => <hr className="my-4 border-line" />,
          blockquote: (p) => (
            <blockquote className="my-2 border-l-2 border-line-strong pl-3 text-muted" {...p} />
          ),
          table: (p) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="border border-line bg-inset px-2 py-1 text-left font-medium" {...p} />
          ),
          td: (p) => <td className="border border-line px-2 py-1 text-muted" {...p} />,
          code({ className, children, ...rest }: ComponentPropsWithoutRef<"code">) {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            const isBlock = className?.includes("language-");
            if (!isBlock) {
              return (
                <code
                  className="surface-inset rounded px-1 py-0.5 font-mono text-[12px] text-ink"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            const text = String(children).replace(/\n$/, "");
            return (
              <pre className="surface-inset my-3 overflow-x-auto rounded-lg p-3 font-mono text-[12px] leading-[1.7]">
                {lang === "gherkin" ? highlightCode(text, lang) : <code>{text}</code>}
              </pre>
            );
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
