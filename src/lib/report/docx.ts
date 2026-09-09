"use client";

/**
 * İstemci tarafı .docx yardımcıları:
 *  - docxToMarkdown: yüklenen .docx dosyasını markdown'a çevirir (mammoth + turndown)
 *  - markdownToDocxBlob: doldurulmuş markdown raporu indirilebilir .docx'e çevirir
 */
import mammoth from "mammoth";
import TurndownService from "turndown";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

/* ------------------------------------------------------------------ */
/* .docx -> markdown                                                   */
/* ------------------------------------------------------------------ */

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

export async function docxToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  return (
    turndown
      .turndown(html)
      // turndown, şablon metnindeki yapı işaretlerini kaçırır — geri al
      .replace(/(\d)\\\./g, "$1.")
      .replace(/\\([[\]{}()#*_])/g, "$1")
      .trim()
  );
}

/* ------------------------------------------------------------------ */
/* markdown -> .docx                                                   */
/* ------------------------------------------------------------------ */

const HEADING_BY_LEVEL: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

/** Bir satır içi metni **kalın** / *italik* / `kod` parçalarına ayırıp TextRun'lara çevirir. */
function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun(text.slice(last, m.index)));
    if (m[2] || m[3]) runs.push(new TextRun({ text: m[2] ?? m[3], bold: true }));
    else if (m[4] || m[5]) runs.push(new TextRun({ text: m[4] ?? m[5], italics: true }));
    else if (m[6]) runs.push(new TextRun({ text: m[6], font: "Consolas" }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length ? runs : [new TextRun(text)];
}

export async function markdownToDocxBlob(markdown: string, title = "Rapor"): Promise<Blob> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const paragraphs: Paragraph[] = [];
  let inCode = false;
  const codeBuf: string[] = [];

  const flushCode = () => {
    for (const c of codeBuf) {
      paragraphs.push(
        new Paragraph({ children: [new TextRun({ text: c || " ", font: "Consolas", size: 20 })] }),
      );
    }
    codeBuf.length = 0;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (/^```/.test(line)) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    if (line.trim() === "") {
      paragraphs.push(new Paragraph({ children: [] }));
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      paragraphs.push(
        new Paragraph({ heading: HEADING_BY_LEVEL[h[1].length], children: inlineRuns(h[2]) }),
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      paragraphs.push(new Paragraph({ border: { bottom: { style: "single", size: 6, space: 1, color: "999999" } }, children: [] }));
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bullet) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: Math.min(3, Math.floor(bullet[1].length / 2)) },
          children: inlineRuns(bullet[2]),
        }),
      );
      continue;
    }

    const numbered = line.match(/^(\s*)\d+[.)]\s+(.*)$/);
    if (numbered) {
      paragraphs.push(
        new Paragraph({ numbering: { reference: "num", level: 0 }, children: inlineRuns(numbered[2]) }),
      );
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      paragraphs.push(
        new Paragraph({
          indent: { left: 360 },
          children: inlineRuns(quote[1]).map((r) => r),
        }),
      );
      continue;
    }

    // tablo satırı -> monospace, hizayı koru
    if (/^\s*\|.*\|\s*$/.test(line)) {
      paragraphs.push(
        new Paragraph({ children: [new TextRun({ text: line, font: "Consolas", size: 18 })] }),
      );
      continue;
    }

    paragraphs.push(new Paragraph({ children: inlineRuns(line) }));
  }
  if (inCode) flushCode();

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "num",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children: paragraphs }],
    title,
  });

  return Packer.toBlob(doc);
}
