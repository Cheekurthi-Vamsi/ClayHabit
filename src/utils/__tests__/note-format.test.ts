import { bodyPreview, deriveTitleFromBody } from '../markdown';
import { inlineText, noteStats, parseInline, parseNoteBlocks, toggleChecklistLine } from '../note-format';

describe('parseInline', () => {
  it('leaves plain text alone', () => {
    expect(parseInline('just words')).toEqual([{ type: 'text', text: 'just words' }]);
  });

  it('recognises every inline style', () => {
    const nodes = parseInline('**b** _i_ ++u++ ~~s~~ ==h== `c` [site](https://x.dev)');
    expect(nodes.filter((node) => node.type !== 'text').map((node) => node.type)).toEqual([
      'bold',
      'italic',
      'underline',
      'strike',
      'highlight',
      'code',
      'link',
    ]);
    expect(inlineText(nodes)).toBe('b i u s h c site');
  });

  it('nests styles, like bold inside a colour', () => {
    expect(parseInline('{red}very **urgent**{/red} today')).toEqual([
      {
        type: 'color',
        color: 'red',
        children: [
          { type: 'text', text: 'very ' },
          { type: 'bold', children: [{ type: 'text', text: 'urgent' }] },
        ],
      },
      { type: 'text', text: ' today' },
    ]);
  });

  it('does not italicise snake_case words or unknown colours', () => {
    expect(parseInline('my_file_name.txt')).toEqual([{ type: 'text', text: 'my_file_name.txt' }]);
    expect(parseInline('{teal}x{/teal}')).toEqual([{ type: 'text', text: '{teal}x{/teal}' }]);
  });

  it('keeps code literal', () => {
    expect(parseInline('`**not bold**`')).toEqual([{ type: 'code', text: '**not bold**' }]);
  });
});

describe('parseNoteBlocks', () => {
  it('splits a note into typed blocks with their line numbers', () => {
    const body = ['# Trip', '## Pack', '- [ ] Passport', '  - [x] Charger', '- Snacks', '1. Book cab', '> Leave early', '---', '```', 'code *raw*', '```', '', 'Done.'].join('\n');
    const blocks = parseNoteBlocks(body);
    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'heading',
      'checklist',
      'checklist',
      'bullet',
      'numbered',
      'quote',
      'divider',
      'code',
      'blank',
      'paragraph',
    ]);
    expect(blocks[3]).toMatchObject({ type: 'checklist', checked: true, indent: 1, line: 3 });
    expect(blocks[8]).toEqual({ type: 'code', text: 'code *raw*', line: 8 });
    expect(blocks[10]).toMatchObject({ line: 12 });
  });

  it('caps headings at three levels', () => {
    expect(parseNoteBlocks('###### Tiny')[0]).toMatchObject({ type: 'heading', level: 3 });
  });
});

describe('toggleChecklistLine', () => {
  it('ticks and unticks only the given line', () => {
    const body = 'List\n- [ ] Milk\n- [x] Eggs';
    expect(toggleChecklistLine(body, 1)).toBe('List\n- [x] Milk\n- [x] Eggs');
    expect(toggleChecklistLine(body, 2)).toBe('List\n- [ ] Milk\n- [ ] Eggs');
    expect(toggleChecklistLine(body, 0)).toBe(body);
    expect(toggleChecklistLine(body, 9)).toBe(body);
  });
});

describe('noteStats', () => {
  it('counts visible words, not markers, and checklist progress', () => {
    const stats = noteStats('# Plan\n- [x] **Call** mum\n- [ ] ==Pay== rent\n---');
    expect(stats.words).toBe(5);
    expect(stats.checklist).toEqual({ done: 1, total: 2 });
    expect(stats.readingMinutes).toBe(1);
    expect(noteStats('').readingMinutes).toBe(0);
  });
});

describe('titles and previews with the new markers', () => {
  it('shows clean text', () => {
    expect(deriveTitleFromBody('# {purple}**Big** idea{/purple}')).toBe('Big idea');
    expect(bodyPreview('Title\n---\n> ==Quote== here\n```\n1. ~~old~~ new', { skipFirstLine: true })).toBe(
      'Quote here old new',
    );
  });
});
