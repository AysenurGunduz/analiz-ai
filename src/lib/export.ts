import type { AnalysisResult, GherkinScenario, UserStory } from "./types";

function gherkinLines(s: GherkinScenario): string[] {
  const out: string[] = [`Scenario: ${s.name}`];
  s.given.forEach((g, i) => out.push(`  ${i === 0 ? "Given" : "And"} ${g}`));
  s.when.forEach((w, i) => out.push(`  ${i === 0 ? "When" : "And"} ${w}`));
  s.then.forEach((t, i) => out.push(`  ${i === 0 ? "Then" : "And"} ${t}`));
  return out;
}

export function storyToMarkdown(story: UserStory): string {
  const lines: string[] = [];
  lines.push(`### ${story.id} · ${story.title}  \`${story.priority}\``);
  lines.push("");
  lines.push(`**As a** ${story.role}  `);
  lines.push(`**I want** ${story.feature}  `);
  lines.push(`**So that** ${story.benefit}`);
  lines.push("");
  lines.push("**Kabul Kriterleri (Gherkin)**");
  lines.push("");
  lines.push("```gherkin");
  story.acceptanceCriteria.forEach((s, i) => {
    if (i > 0) lines.push("");
    lines.push(...gherkinLines(s));
  });
  lines.push("```");
  if (story.edgeCases.length) {
    lines.push("");
    lines.push("**Negatif / İstisnai Durumlar**");
    lines.push("");
    story.edgeCases.forEach((e) => lines.push(`- ${e}`));
  }
  if (story.businessRules.length) {
    lines.push("");
    lines.push("**İş Kuralları**");
    lines.push("");
    story.businessRules.forEach((r) => lines.push(`- ${r}`));
  }
  return lines.join("\n");
}

export function toMarkdown(r: AnalysisResult): string {
  const lines: string[] = [];
  lines.push(`# ${r.title}`);
  lines.push("");
  lines.push(r.summary);
  if (r.assumptions.length) {
    lines.push("");
    lines.push("## Varsayımlar");
    lines.push("");
    r.assumptions.forEach((a) => lines.push(`- ${a}`));
  }
  if (r.openQuestions.length) {
    lines.push("");
    lines.push("## Açık Sorular");
    lines.push("");
    r.openQuestions.forEach((q) => lines.push(`- ${q}`));
  }
  lines.push("");
  lines.push("## Kullanıcı Hikayeleri");
  r.stories.forEach((s) => {
    lines.push("");
    lines.push(storyToMarkdown(s));
  });
  lines.push("");
  return lines.join("\n");
}

/** Jira wiki markup (kaba çeviri, yapıştırılıp düzenlenebilir). */
export function toJira(r: AnalysisResult): string {
  const lines: string[] = [];
  lines.push(`h1. ${r.title}`);
  lines.push("");
  lines.push(r.summary);
  r.stories.forEach((story) => {
    lines.push("");
    lines.push(`h2. ${story.id} · ${story.title} ({{${story.priority}}})`);
    lines.push(`*As a* ${story.role}`);
    lines.push(`*I want* ${story.feature}`);
    lines.push(`*So that* ${story.benefit}`);
    lines.push("");
    lines.push("*Kabul Kriterleri*");
    lines.push("{code:gherkin}");
    story.acceptanceCriteria.forEach((s, i) => {
      if (i > 0) lines.push("");
      lines.push(...gherkinLines(s));
    });
    lines.push("{code}");
    if (story.edgeCases.length) {
      lines.push("");
      lines.push("*Negatif / İstisnai Durumlar*");
      story.edgeCases.forEach((e) => lines.push(`* ${e}`));
    }
    if (story.businessRules.length) {
      lines.push("");
      lines.push("*İş Kuralları*");
      story.businessRules.forEach((rule) => lines.push(`* ${rule}`));
    }
  });
  lines.push("");
  return lines.join("\n");
}

export function toJson(r: AnalysisResult): string {
  return JSON.stringify(r, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
