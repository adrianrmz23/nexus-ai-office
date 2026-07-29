import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; language: string; code: string }
  | { type: "separator" };

function inlineNodes(text: string): ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const token = match[0];

    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`inline-code-${key}`}
          className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-cyan-100/85"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`strong-${key}`} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={`em-${key}`} className="text-slate-200">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      nodes.push(
        link ? (
          <a
            key={`link-${key}`}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="text-primary/80 underline decoration-primary/25 underline-offset-4 hover:text-primary"
          >
            {link[1]}
          </a>
        ) : (
          token
        ),
      );
    }

    cursor = index + token.length;
    key += 1;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "unordered-list" | "ordered-list" | null = null;
  let codeLines: string[] = [];
  let codeLanguage = "";
  let inCode = false;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems });
    listItems = [];
    listType = null;
  };
  const flushCode = () => {
    blocks.push({ type: "code", language: codeLanguage, code: codeLines.join("\n") });
    codeLines = [];
    codeLanguage = "";
  };

  for (const line of lines) {
    const fence = line.match(/^```\s*([\w#+.-]*)\s*$/);
    if (fence) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
        codeLanguage = fence[1] ?? "";
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "separator" });
      continue;
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== "unordered-list") flushList();
      listType = "unordered-list";
      listItems.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== "ordered-list") flushList();
      listType = "ordered-list";
      listItems.push(ordered[1]);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1] });
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  if (inCode || codeLines.length) flushCode();
  return blocks;
}

export function MessageMarkdown({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  const blocks = parseBlocks(content);

  return (
    <div
      className={cn(
        "break-words text-sm text-slate-300",
        compact ? "space-y-1.5 text-[0.7rem] leading-5" : "space-y-3 leading-7",
      )}
    >
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          const classes = compact
            ? "font-semibold text-slate-300"
            : block.level <= 2
              ? "pt-1 text-base font-semibold text-white"
              : "pt-1 text-sm font-semibold text-slate-100";
          return (
            <div key={key} role="heading" aria-level={block.level} className={classes}>
              {inlineNodes(block.text)}
            </div>
          );
        }
        if (block.type === "paragraph") {
          return <p key={key}>{inlineNodes(block.text)}</p>;
        }
        if (block.type === "unordered-list") {
          return (
            <ul key={key} className="space-y-1.5 pl-5 marker:text-primary/50">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="list-disc pl-1">
                  {inlineNodes(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ordered-list") {
          return (
            <ol key={key} className="space-y-1.5 pl-5 marker:text-primary/60">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className="list-decimal pl-1">
                  {inlineNodes(item)}
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-primary/25 pl-3 text-slate-400"
            >
              {inlineNodes(block.text)}
            </blockquote>
          );
        }
        if (block.type === "code") {
          return (
            <div key={key} className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/30">
              {block.language && (
                <div className="border-b border-white/[0.05] px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-slate-600">
                  {block.language}
                </div>
              )}
              <pre className="nexus-scrollbar overflow-x-auto p-3 text-xs leading-6 text-cyan-50/80">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }
        return <hr key={key} className="border-white/[0.06]" />;
      })}
    </div>
  );
}
