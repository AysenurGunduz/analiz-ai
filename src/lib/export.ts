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

/**
 * Cucumber `.feature` metni — her User Story bir `Feature:` bloğu olur.
 * Doğrudan QA otomasyonuna yapıştırılabilir; edge case ve iş kuralları
 * yorum satırı olarak eklenir (senaryoya çevrilmesi analiste kalır).
 */
export function toGherkinFeature(r: AnalysisResult): string {
  const out: string[] = [
    `# ${r.title}`,
    ...r.summary.split("\n").map((l) => `# ${l}`),
    "# Kaynak: ReqToStory · üretilen taslak, gözden geçirin",
  ];
  if (r.assumptions.length) {
    out.push("#", "# Varsayımlar:");
    r.assumptions.forEach((a) => out.push(`#   - ${a}`));
  }
  if (r.openQuestions.length) {
    out.push("#", "# Açık sorular:");
    r.openQuestions.forEach((q) => out.push(`#   - ${q}`));
  }

  r.stories.forEach((story) => {
    out.push("");
    out.push(`@${slugTag(story.id)} @oncelik-${slugTag(story.priority)}`);
    out.push(`Feature: ${story.title}`);
    out.push(`  As a ${story.role}`);
    out.push(`  I want ${story.feature}`);
    out.push(`  So that ${story.benefit}`);
    story.acceptanceCriteria.forEach((s) => {
      out.push("");
      out.push(...gherkinLines(s).map((l) => `  ${l}`));
    });
    if (story.edgeCases.length) {
      out.push("");
      out.push("  # Negatif / istisnai durumlar (senaryolaştırılacak):");
      story.edgeCases.forEach((e) => out.push(`  #   - ${e}`));
    }
    if (story.businessRules.length) {
      out.push("");
      out.push("  # İş kuralları:");
      story.businessRules.forEach((rule) => out.push(`  #   - ${rule}`));
    }
  });
  out.push("");
  return out.join("\n");
}

/** Etiket/dosya adı için güvenli slug (Türkçe karakterleri sadeleştirir). */
function slugTag(s: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U",
  };
  return s
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => map[c] ?? c)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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
