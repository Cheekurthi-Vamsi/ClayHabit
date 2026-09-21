export function deriveTitleFromBody(body: string): string {
  const firstLine = body.split('\n').find((line) => line.trim().length > 0) ?? '';
  return firstLine.trim().replace(/^#{1,6}\s*/, '').slice(0, 80);
}

function stripLineMarkers(line: string): string {
  return line
    .replace(/^-\s*\[[ xX]\]\s*/, '') // checklist marker
    .replace(/^[-*]\s+/, '') // bullet marker
    .replace(/^\d+\.\s+/, '') // numbered list marker
    .replace(/^#{1,6}\s*/, '') // heading marker
    .replace(/[*_`]/g, ''); // inline emphasis/code markers
}

export function getPreviewText(body: string): string {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(1).map(stripLineMarkers).join(' ').slice(0, 140);
}
