/**
 * Notes are plain text with light markdown, written through a toolbar that
 * inserts the markers. This turns that text into blocks and styled runs for
 * the reading view. Supported:
 *
 *   # Heading   ## Heading   ### Heading
 *   - bullet    1. numbered   - [ ] todo   - [x] done
 *   > quote     ---  (divider)             ``` code block ```
 *   **bold**  _italic_  ++underline++  ~~strike~~  ==highlight==  `code`
 *   {red}coloured text{/red}   [link text](https://…)
 */

export const NOTE_TEXT_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'] as const;
export type NoteTextColor = (typeof NOTE_TEXT_COLORS)[number];

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'bold' | 'italic' | 'underline' | 'strike' | 'highlight'; children: InlineNode[] }
  | { type: 'color'; color: NoteTextColor; children: InlineNode[] };

export type NoteBlock =
  | { type: 'heading'; level: 1 | 2 | 3; inline: InlineNode[]; line: number }
  | { type: 'paragraph'; inline: InlineNode[]; line: number }
  | { type: 'bullet'; inline: InlineNode[]; indent: number; line: number }
  | { type: 'numbered'; number: number; inline: InlineNode[]; indent: number; line: number }
  | { type: 'checklist'; checked: boolean; inline: InlineNode[]; indent: number; line: number }
  | { type: 'quote'; inline: InlineNode[]; line: number }
  | { type: 'code'; text: string; line: number }
  | { type: 'divider'; line: number }
  | { type: 'blank'; line: number };

interface InlineRule {
  pattern: RegExp;
  build: (match: RegExpExecArray) => InlineNode;
  /** Extra check a regex can't express portably (Hermes-safe: no lookbehind). */
  accept?: (source: string, match: RegExpExecArray) => boolean;
}

const WORD = /[A-Za-z0-9]/;

const COLOR_PATTERN = new RegExp(`\\{(${NOTE_TEXT_COLORS.join('|')})\\}([\\s\\S]+?)\\{\\/\\1\\}`, 'g');

const RULES: InlineRule[] = [
  { pattern: /`([^`\n]+)`/g, build: (m) => ({ type: 'code', text: m[1] }) },
  { pattern: /\[([^\]\n]+)\]\(([^)\s]+)\)/g, build: (m) => ({ type: 'link', text: m[1], url: m[2] }) },
  {
    pattern: COLOR_PATTERN,
    build: (m) => ({ type: 'color', color: m[1] as NoteTextColor, children: parseInline(m[2]) }),
  },
  { pattern: /\*\*([^\n]+?)\*\*/g, build: (m) => ({ type: 'bold', children: parseInline(m[1]) }) },
  { pattern: /\+\+([^\n]+?)\+\+/g, build: (m) => ({ type: 'underline', children: parseInline(m[1]) }) },
  { pattern: /~~([^\n]+?)~~/g, build: (m) => ({ type: 'strike', children: parseInline(m[1]) }) },
  { pattern: /==([^\n]+?)==/g, build: (m) => ({ type: 'highlight', children: parseInline(m[1]) }) },
  {
    // _italic_ — but not snake_case_words.
    pattern: /_([^_\n]+?)_/g,
    build: (m) => ({ type: 'italic', children: parseInline(m[1]) }),
    accept: (source, m) => {
      const before = source[m.index - 1] ?? ' ';
      const after = source[m.index + m[0].length] ?? ' ';
      return !WORD.test(before) && !WORD.test(after);
    },
  },
];

function firstMatch(source: string, from: number): { rule: InlineRule; match: RegExpExecArray } | null {
  let best: { rule: InlineRule; match: RegExpExecArray } | null = null;
  for (const rule of RULES) {
    rule.pattern.lastIndex = from;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(source)) !== null) {
      if (!rule.accept || rule.accept(source, match)) break;
      rule.pattern.lastIndex = match.index + 1;
    }
    if (match && (!best || match.index < best.match.index)) best = { rule, match };
  }
  return best;
}

export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let position = 0;
  while (position < source.length) {
    const found = firstMatch(source, position);
    if (!found) break;
    if (found.match.index > position) nodes.push({ type: 'text', text: source.slice(position, found.match.index) });
    nodes.push(found.rule.build(found.match));
    position = found.match.index + found.match[0].length;
  }
  if (position < source.length) nodes.push({ type: 'text', text: source.slice(position) });
  return nodes;
}

function indentOf(raw: string): number {
  const spaces = raw.match(/^\s*/)?.[0].replace(/\t/g, '  ').length ?? 0;
  return Math.min(3, Math.floor(spaces / 2));
}

export function parseNoteBlocks(body: string): NoteBlock[] {
  const lines = body.split('\n');
  const blocks: NoteBlock[] = [];

  for (let line = 0; line < lines.length; line++) {
    const raw = lines[line];
    const trimmed = raw.trim();

    if (trimmed.startsWith('```')) {
      const start = line;
      const code: string[] = [];
      line++;
      while (line < lines.length && !lines[line].trim().startsWith('```')) {
        code.push(lines[line]);
        line++;
      }
      blocks.push({ type: 'code', text: code.join('\n'), line: start });
      continue;
    }
    if (trimmed === '') {
      blocks.push({ type: 'blank', line });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'divider', line });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(3, heading[1].length) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, inline: parseInline(heading[2]), line });
      continue;
    }
    const check = /^\s*[-*]\s+\[( |x|X)\]\s?(.*)$/.exec(raw);
    if (check) {
      blocks.push({
        type: 'checklist',
        checked: check[1].toLowerCase() === 'x',
        inline: parseInline(check[2]),
        indent: indentOf(raw),
        line,
      });
      continue;
    }
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(raw);
    if (bullet) {
      blocks.push({ type: 'bullet', inline: parseInline(bullet[1]), indent: indentOf(raw), line });
      continue;
    }
    const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(raw);
    if (numbered) {
      blocks.push({
        type: 'numbered',
        number: Number(numbered[1]),
        inline: parseInline(numbered[2]),
        indent: indentOf(raw),
        line,
      });
      continue;
    }
    const quote = /^>\s?(.*)$/.exec(trimmed);
    if (quote) {
      blocks.push({ type: 'quote', inline: parseInline(quote[1]), line });
      continue;
    }
    blocks.push({ type: 'paragraph', inline: parseInline(raw), line });
  }
  return blocks;
}

/** Ticks or unticks the checklist item on `line`; any other line is left alone. */
export function toggleChecklistLine(body: string, line: number): string {
  const lines = body.split('\n');
  const current = lines[line];
  if (current === undefined) return body;
  const match = /^(\s*[-*]\s+\[)( |x|X)(\].*)$/.exec(current);
  if (!match) return body;
  lines[line] = `${match[1]}${match[2] === ' ' ? 'x' : ' '}${match[3]}`;
  return lines.join('\n');
}

/** The text a run shows, markers removed — for counting words and building previews. */
export function inlineText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((node) => (node.type === 'text' || node.type === 'code' || node.type === 'link' ? node.text : inlineText(node.children)))
    .join('');
}

export interface NoteStats {
  words: number;
  characters: number;
  /** At ~200 words a minute, at least 1 once there's any text. */
  readingMinutes: number;
  checklist: { done: number; total: number };
}

export function noteStats(body: string): NoteStats {
  const blocks = parseNoteBlocks(body);
  let text = '';
  let done = 0;
  let total = 0;
  for (const block of blocks) {
    if (block.type === 'code') text += `${block.text}\n`;
    else if ('inline' in block) text += `${inlineText(block.inline)}\n`;
    if (block.type === 'checklist') {
      total++;
      if (block.checked) done++;
    }
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    words,
    characters: text.replace(/\n/g, '').length,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 200)),
    checklist: { done, total },
  };
}
