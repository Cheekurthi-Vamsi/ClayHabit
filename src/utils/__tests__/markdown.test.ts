import { bodyPreview, deriveTitleFromBody, displayTitle, splitTitleFromBody } from '../markdown';

describe('deriveTitleFromBody', () => {
  it('uses the first non-empty line as the title', () => {
    expect(deriveTitleFromBody('Project Ideas\n\nSome notes here')).toBe('Project Ideas');
  });

  it('strips a leading markdown heading marker', () => {
    expect(deriveTitleFromBody('## Cybersecurity\nNetwork analysis...')).toBe('Cybersecurity');
  });

  it('returns an empty string for an empty body', () => {
    expect(deriveTitleFromBody('')).toBe('');
    expect(deriveTitleFromBody('\n\n')).toBe('');
  });

  it('truncates very long first lines to 80 characters', () => {
    const long = 'a'.repeat(200);
    expect(deriveTitleFromBody(long)).toHaveLength(80);
  });
});

describe('bodyPreview', () => {
  it('joins lines, stripping markdown symbols', () => {
    expect(bodyPreview('**Bold idea**\n- bullet point')).toBe('Bold idea bullet point');
  });

  it('can skip a first line that is already the title', () => {
    expect(bodyPreview('Project Ideas\n**Bold idea**', { skipFirstLine: true })).toBe('Bold idea');
    expect(bodyPreview('Just a title', { skipFirstLine: true })).toBe('');
  });

  it('strips checklist marker prefixes from every preview line', () => {
    expect(bodyPreview('- [ ] Milk\n- [x] Eggs')).toBe('Milk Eggs');
  });
});

describe('splitTitleFromBody', () => {
  it('moves the first line into the title and drops the blank lines after it', () => {
    expect(splitTitleFromBody('\n## Plan\n\n- [ ] Call\nMore')).toEqual({ title: 'Plan', body: '- [ ] Call\nMore' });
  });

  it('handles empty and title-only bodies', () => {
    expect(splitTitleFromBody('')).toEqual({ title: '', body: '' });
    expect(splitTitleFromBody('Only')).toEqual({ title: 'Only', body: '' });
  });
});

describe('displayTitle', () => {
  it('prefers the title, then the first line, then Untitled', () => {
    expect(displayTitle({ title: 'Ideas', body: 'x' })).toBe('Ideas');
    expect(displayTitle({ title: ' ', body: '# First line' })).toBe('First line');
    expect(displayTitle({ title: '', body: '' })).toBe('Untitled');
  });
});
