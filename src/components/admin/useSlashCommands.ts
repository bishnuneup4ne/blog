"use client";

import { useEffect, useRef, useState } from "react";
import type SimpleMDE from "easymde";

export type SlashCommand = {
  name: string;
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  insert: (cm: SimpleMDE["codemirror"]) => void;
};

function insertBlock(cm: any, text: string, selectInside = false) {
  const doc = cm.getDoc();
  const cursor = doc.getCursor();
  const lineContent = doc.getLine(cursor.line);
  const before = lineContent.slice(0, cursor.ch);
  const needsPre = before.trim().length > 0;
  const body = needsPre ? "\n" + text : text;
  doc.replaceRange(body, cursor);
  if (selectInside) {
    const marker = text.indexOf("](URL)");
    if (marker >= 0) {
      const after = doc.getCursor();
      const startCh = after.ch + marker - text.length + 2;
      doc.setSelection(
        { line: after.line, ch: Math.max(0, startCh) },
        { line: after.line, ch: Math.max(0, startCh) + 3 },
      );
    }
  }
  cm.focus();
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "h1", label: "Heading 1", description: "Large section heading", keywords: ["h1", "heading", "title"], icon: "H1", insert: (cm) => insertBlock(cm, "# ") },
  { name: "h2", label: "Heading 2", description: "Medium section heading", keywords: ["h2", "heading", "subtitle"], icon: "H2", insert: (cm) => insertBlock(cm, "## ") },
  { name: "h3", label: "Heading 3", description: "Small section heading", keywords: ["h3", "heading"], icon: "H3", insert: (cm) => insertBlock(cm, "### ") },
  { name: "bullet", label: "Bulleted list", description: "Unordered list item", keywords: ["bullet", "list", "ul"], icon: "\u2022", insert: (cm) => insertBlock(cm, "- ") },
  { name: "numbered", label: "Numbered list", description: "Ordered list item", keywords: ["numbered", "list", "ol"], icon: "1.", insert: (cm) => insertBlock(cm, "1. ") },
  { name: "quote", label: "Quote", description: "Blockquoted text", keywords: ["quote", "blockquote"], icon: "\u201c", insert: (cm) => insertBlock(cm, "> ") },
  { name: "code", label: "Code block", description: "Fenced code", keywords: ["code", "block", "fence", "pre"], icon: "</>", insert: (cm) => insertBlock(cm, "```js\n// code\n```\n") },
  { name: "image", label: "Image", description: "Insert image (URL or upload)", keywords: ["image", "picture", "photo", "img"], icon: "\u25a3", insert: (cm) => insertBlock(cm, "![alt](URL)") },
  { name: "link", label: "Link", description: "Inline link", keywords: ["link", "url", "href", "anchor"], icon: "\u27a4", insert: (cm) => insertBlock(cm, "[text](https://)") },
  { name: "table", label: "Table", description: "3-column GFM table", keywords: ["table", "grid"], icon: "\u25a4", insert: (cm) => insertBlock(cm, "| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n|       |       |       |\n") },
  { name: "hr", label: "Divider", description: "Horizontal rule", keywords: ["divider", "rule", "hr", "line"], icon: "\u2014", insert: (cm) => insertBlock(cm, "\n---\n\n") },
  {
    name: "mermaid",
    label: "Flowchart",
    description: "Mermaid diagram",
    keywords: ["mermaid", "flow", "chart", "diagram"],
    icon: "\u29bf",
    insert: (cm) =>
      insertBlock(
        cm,
        "```mermaid\nflowchart LR\n    A[Start] --> B{Decision?}\n    B -->|Yes| C[Result 1]\n    B -->|No| D[Result 2]\n```\n",
      ),
  },
  { name: "callout", label: "Callout", description: "Highlighted note block", keywords: ["callout", "note", "info", "tip"], icon: "\u26a0", insert: (cm) => insertBlock(cm, "> **Note**\n> Your message here.\n") },
];

export type SlashState = {
  open: boolean;
  query: string;
  position: { top: number; left: number } | null;
  activeIndex: number;
  matches: SlashCommand[];
};

const CLOSED: SlashState = { open: false, query: "", position: null, activeIndex: 0, matches: [] };

function computeMatches(query: string): SlashCommand[] {
  const q = query.toLowerCase();
  if (!q) return SLASH_COMMANDS.slice();
  return SLASH_COMMANDS.filter((c) => {
    return (
      c.name.startsWith(q) ||
      c.label.toLowerCase().startsWith(q) ||
      c.keywords.some((k) => k.startsWith(q)) ||
      c.keywords.some((k) => k.includes(q))
    );
  });
}

export function useSlashCommands(
  mdeRef: React.MutableRefObject<SimpleMDE | null>,
  ready: boolean,
) {
  const [state, setState] = useState<SlashState>(CLOSED);
  const stateRef = useRef<SlashState>(CLOSED);
  const tokenStartRef = useRef<{ line: number; ch: number } | null>(null);
  const cmRef = useRef<any>(null);

  const update = (next: SlashState) => {
    stateRef.current = next;
    setState(next);
  };

  useEffect(() => {
    if (!ready) return;
    const mde = mdeRef.current;
    if (!mde) return;
    const cm = mde.codemirror as any;
    cmRef.current = cm;

    const coordsForCursor = (pos: { line: number; ch: number }) => {
      const cc = cm.cursorCoords(pos);
      const wrapEl = cm.getWrapperElement();
      const parentRect = wrapEl.getBoundingClientRect();
      return {
        top: cc.bottom - parentRect.top + 4,
        left: cc.left - parentRect.left,
      };
    };

    const onInput = (_cm: any, change: any) => {
      if (change.origin === "paste" || change.origin === "Complete") return;
      const cursor = _cm.getCursor();
      const line = _cm.getLine(cursor.line);
      const before = line.slice(0, cursor.ch);
      const slashIdx = before.lastIndexOf("/");
      if (slashIdx < 0) {
        if (stateRef.current.open) update(CLOSED);
        tokenStartRef.current = null;
        return;
      }
      const charBefore = slashIdx === 0 ? " " : before[slashIdx - 1];
      if (!/\s/.test(charBefore)) {
        if (stateRef.current.open) update(CLOSED);
        tokenStartRef.current = null;
        return;
      }
      const query = before.slice(slashIdx + 1);
      if (/[\s]/.test(query)) {
        if (stateRef.current.open) update(CLOSED);
        tokenStartRef.current = null;
        return;
      }
      tokenStartRef.current = { line: cursor.line, ch: slashIdx };
      const matches = computeMatches(query);
      const position = coordsForCursor({ line: cursor.line, ch: slashIdx + 1 });
      update({
        open: matches.length > 0,
        query,
        position,
        activeIndex: 0,
        matches,
      });
    };

    const onCursorActivity = (c: any) => {
      if (!stateRef.current.open) return;
      const cursor = c.getCursor();
      const start = tokenStartRef.current;
      if (!start || cursor.line !== start.line || cursor.ch < start.ch) {
        update(CLOSED);
      } else {
        const position = coordsForCursor({ line: start.line, ch: start.ch + 1 });
        update({ ...stateRef.current, position });
      }
    };

    const pickActive = () => {
      const s = stateRef.current;
      const picked = s.matches[s.activeIndex];
      if (!picked) {
        update(CLOSED);
        return;
      }
      const start = tokenStartRef.current;
      const cursor = cm.getCursor();
      if (start && cursor.line === start.line) {
        cm.getDoc().replaceRange("", { line: start.line, ch: start.ch }, cursor);
        cm.setCursor({ line: start.line, ch: start.ch });
      }
      picked.insert(cm);
      update(CLOSED);
      tokenStartRef.current = null;
    };

    cm.on("inputRead", onInput);
    cm.on("cursorActivity", onCursorActivity);
    cm.addKeyMap({
      ArrowDown: () => {
        if (!stateRef.current.open) return false;
        const len = stateRef.current.matches.length || 1;
        update({ ...stateRef.current, activeIndex: (stateRef.current.activeIndex + 1) % len });
        return true;
      },
      ArrowUp: () => {
        if (!stateRef.current.open) return false;
        const len = stateRef.current.matches.length || 1;
        update({
          ...stateRef.current,
          activeIndex: (stateRef.current.activeIndex - 1 + len) % len,
        });
        return true;
      },
      Enter: () => {
        if (!stateRef.current.open) return false;
        pickActive();
        return true;
      },
      Tab: () => {
        if (!stateRef.current.open) return false;
        pickActive();
        return true;
      },
      Esc: () => {
        if (!stateRef.current.open) return false;
        update(CLOSED);
        return true;
      },
    });

    return () => {
      cm.off("inputRead", onInput);
      cm.off("cursorActivity", onCursorActivity);
    };
  }, [mdeRef, ready]);

  const pick = (command: SlashCommand) => {
    const cm = cmRef.current;
    if (!cm) return;
    const start = tokenStartRef.current;
    const cursor = cm.getCursor();
    if (start && cursor.line === start.line) {
      cm.getDoc().replaceRange("", { line: start.line, ch: start.ch }, cursor);
      cm.setCursor({ line: start.line, ch: start.ch });
    }
    command.insert(cm);
    update(CLOSED);
    tokenStartRef.current = null;
  };

  const setActive = (i: number) => {
    if (!stateRef.current.open) return;
    update({ ...stateRef.current, activeIndex: i });
  };

  const close = () => update(CLOSED);

  return { state, pick, setActive, close };
}
