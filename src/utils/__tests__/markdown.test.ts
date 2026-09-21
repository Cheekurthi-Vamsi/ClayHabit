import { deriveTitleFromBody, getPreviewText } from '../markdown';

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

describe('getPreviewText', () => {
  it('joins lines after the title, stripping markdown symbols', () => {
    const body = 'Project Ideas\n**Bold idea**\n- bullet point';
    expect(getPreviewText(body)).toBe('Bold idea bullet point');
  });

  it('strips checklist marker prefixes from every preview line', () => {
    const body = 'Groceries\n- [ ] Milk\n- [x] Eggs';
    expect(getPreviewText(body)).toBe('Milk Eggs');
  });

  it('returns an empty string when there is only a title', () => {
    expect(getPreviewText('Just a title')).toBe('');
  });
});
