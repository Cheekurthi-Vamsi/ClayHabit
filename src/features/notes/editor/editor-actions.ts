/**
 * Pure text edits behind the editor toolbar. The note body is plain text
 * with light markdown (see utils/note-format.ts), so every format action is
 * a string transform plus where the cursor should land afterwards. Keeping
 * them pure keeps the editor UI thin and lets new block types plug in here.
 */

export interface Selection {
  start: number;
  end: number;
}

export interface EditResult {
  body: string;
  selection: Selection;
}

/** Wraps the selection in `marker` (or removes it if already wrapped). Empty selection: markers around the cursor. */
export function toggleWrap(body: string, selection: Selection, marker: string, closing = marker): EditResult {
  const { start, end } = selection;
  const before = body.slice(0, start);
  const selected = body.slice(start, end);
  const after = body.slice(end);

  if (before.endsWith(marker) && after.startsWith(closing)) {
    const next = before.slice(0, -marker.length) + selected + after.slice(closing.length);
    return { body: next, selection: { start: start - marker.length, end: end - marker.length } };
  }
  const next = before + marker + selected + closing + after;
  return { body: next, selection: { start: start + marker.length, end: end + marker.length } };
}

function lineBounds(body: string, index: number): { start: number; end: number } {
  const start = body.lastIndexOf('\n', index - 1) + 1;
  const newline = body.indexOf('\n', index);
  return { start, end: newline === -1 ? body.length : newline };
}

/** Anything that already makes a line a block (heading, list, checklist, quote). */
const BLOCK_PREFIX = /^(\s*)(#{1,6}\s+|[-*]\s+\[[ xX]\]\s+|[-*•]\s+|\d+[.)]\s+|>\s?)/;

/**
 * Turns the cursor's line into the given block (`# `, `- `, `- [ ] `, `1. `, `> `),
 * replacing any other block prefix — or back to plain text if it already is one.
 */
export function toggleLinePrefix(body: string, selection: Selection, prefix: string): EditResult {
  const { start: lineStart, end: lineEnd } = lineBounds(body, selection.start);
  const line = body.slice(lineStart, lineEnd);
  const match = BLOCK_PREFIX.exec(line);
  const indent = match?.[1] ?? '';
  const existing = match ? match[2] : '';
  const content = line.slice(indent.length + existing.length);
  const samePrefix = existing.trim().replace(/\[[xX]\]/, '[ ]') === prefix.trim();

  const nextLine = samePrefix ? indent + content : indent + prefix + content;
  const delta = nextLine.length - line.length;
  const next = body.slice(0, lineStart) + nextLine + body.slice(lineEnd);
  const clamp = (value: number) => Math.max(lineStart, Math.min(value + delta, lineStart + nextLine.length));
  return { body: next, selection: { start: clamp(selection.start), end: clamp(selection.end) } };
}

/** Inserts a block (divider, code fence) on its own lines at the cursor. */
export function insertBlock(body: string, selection: Selection, block: string, cursorOffset = block.length): EditResult {
  const before = body.slice(0, selection.start);
  const after = body.slice(selection.end);
  const lead = before.length === 0 || before.endsWith('\n') ? '' : '\n';
  const trail = after.startsWith('\n') ? '' : '\n';
  const next = before + lead + block + trail + after;
  const cursor = before.length + lead.length + cursorOffset;
  return { body: next, selection: { start: cursor, end: cursor } };
}

/** `[text](url)` around the selection, with the url selected so it can be typed over. */
export function insertLink(body: string, selection: Selection): EditResult {
  const text = body.slice(selection.start, selection.end) || 'link';
  const insertion = `[${text}](https://)`;
  const next = body.slice(0, selection.start) + insertion + body.slice(selection.end);
  const urlStart = selection.start + text.length + 3;
  return { body: next, selection: { start: urlStart, end: urlStart + 'https://'.length } };
}

const LIST_ITEM = /^(\s*)([-*•]\s+\[[ xX]\]\s+|[-*•]\s+|(\d+)([.)])\s+)(.*)$/;

/**
 * Called with the text before and after a keystroke. When that keystroke was
 * Enter at the end of a list item, the new line continues the list (a
 * ticked item continues unticked, numbers count up); Enter on an empty item
 * ends the list instead. Returns null when nothing needs to change.
 */
export function continueList(previous: string, next: string, cursor: number): EditResult | null {
  if (next.length !== previous.length + 1 || next[cursor - 1] !== '\n') return null;
  const lineEnd = cursor - 1;
  const lineStart = next.lastIndexOf('\n', lineEnd - 1) + 1;
  const line = next.slice(lineStart, lineEnd);
  const match = LIST_ITEM.exec(line);
  if (!match) return null;

  const [, indent, marker, number, punctuation, content] = match;
  if (content.trim() === '') {
    // Empty item: Enter ends the list, removing the dangling marker.
    const body = next.slice(0, lineStart) + next.slice(cursor);
    return { body, selection: { start: lineStart, end: lineStart } };
  }

  const continued = number
    ? `${indent}${Number(number) + 1}${punctuation} `
    : `${indent}${marker.replace(/\[[xX]\]/, '[ ]')}`;
  const body = next.slice(0, cursor) + continued + next.slice(cursor);
  const position = cursor + continued.length;
  return { body, selection: { start: position, end: position } };
}

/** Bounded undo/redo history of body snapshots. */
export class EditHistory {
  private past: string[] = [];
  private future: string[] = [];

  constructor(private readonly limit = 100) {}

  /** Records the state before a change. */
  push(snapshot: string): void {
    if (this.past[this.past.length - 1] === snapshot) return;
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  undo(current: string): string | null {
    const previous = this.past.pop();
    if (previous === undefined) return null;
    this.future.push(current);
    return previous;
  }

  redo(current: string): string | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(current);
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
