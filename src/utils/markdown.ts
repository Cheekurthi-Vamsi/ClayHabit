import { inlineText, parseInline } from './note-format';

/** A line's visible text: list/heading/quote prefixes and inline markers (**, ==, {red}…) removed. */
function plainLine(line: string): string {
  const withoutPrefix = line
    .replace(/^\s*[-*]\s*\[[ xX]\]\s*/, '') // checklist marker
    .replace(/^\s*[-*•]\s+/, '') // bullet marker
    .replace(/^\s*\d+[.)]\s+/, '') // numbered list marker
    .replace(/^#{1,6}\s*/, '') // heading marker
    .replace(/^>\s?/, ''); // quote marker
  return inlineText(parseInline(withoutPrefix)).trim();
}

export function deriveTitleFromBody(body: string): string {
  const firstLine = body.split('\n').find((line) => line.trim().length > 0) ?? '';
  return plainLine(firstLine.trim()).slice(0, 80);
}

/**
 * Splits a body whose first line doubles as its title (how notes were stored
 * before they had a title field) into that title and the rest.
 */
export function splitTitleFromBody(body: string): { title: string; body: string } {
  const lines = body.split('\n');
  const index = lines.findIndex((line) => line.trim().length > 0);
  if (index === -1) return { title: '', body: '' };
  const rest = lines.slice(index + 1);
  while (rest.length > 0 && rest[0].trim() === '') rest.shift();
  return { title: plainLine(lines[index].trim()).slice(0, 80), body: rest.join('\n') };
}

/** What a list shows as the note's name: its title, else its first line, else "Untitled". */
export function displayTitle(note: { title: string; body: string }): string {
  return note.title.trim() || deriveTitleFromBody(note.body) || 'Untitled';
}

/** Dividers and code fences carry no words worth previewing. */
function isStructural(line: string): boolean {
  return /^(-{3,}|\*{3,}|_{3,}|```.*)$/.test(line);
}

/**
 * Plain-text preview of a note body, markers removed.
 * `skipFirstLine` is for bodies whose first line is already shown as the title.
 */
export function bodyPreview(body: string, { skipFirstLine = false, maxLength = 160 } = {}): string {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .slice(skipFirstLine ? 1 : 0)
    .filter((line) => !isStructural(line))
    .map(plainLine)
    .filter(Boolean)
    .join(' ')
    .slice(0, maxLength);
}
