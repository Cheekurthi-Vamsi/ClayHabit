import { continueList, EditHistory, insertBlock, insertLink, toggleLinePrefix, toggleWrap } from '../editor-actions';

describe('toggleWrap', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(toggleWrap('make bold here', { start: 5, end: 9 }, '**')).toEqual({
      body: 'make **bold** here',
      selection: { start: 7, end: 11 },
    });
  });

  it('unwraps text that is already wrapped', () => {
    expect(toggleWrap('make **bold** here', { start: 7, end: 11 }, '**')).toEqual({
      body: 'make bold here',
      selection: { start: 5, end: 9 },
    });
  });
});

describe('toggleLinePrefix', () => {
  it('turns the cursor line into a checklist item and back', () => {
    const on = toggleLinePrefix('one\nBuy milk\nthree', { start: 8, end: 8 }, '- [ ] ');
    expect(on.body).toBe('one\n- [ ] Buy milk\nthree');
    expect(on.selection.start).toBe(14);
    expect(toggleLinePrefix(on.body, on.selection, '- [ ] ').body).toBe('one\nBuy milk\nthree');
  });

  it('swaps one block type for another instead of stacking them', () => {
    expect(toggleLinePrefix('- item', { start: 3, end: 3 }, '# ').body).toBe('# item');
    expect(toggleLinePrefix('- [x] done', { start: 3, end: 3 }, '- [ ] ').body).toBe('done');
  });
});

describe('insertBlock and insertLink', () => {
  it('puts blocks on their own lines', () => {
    expect(insertBlock('abc', { start: 3, end: 3 }, '---').body).toBe('abc\n---\n');
    expect(insertBlock('', { start: 0, end: 0 }, '```\n\n```', 4)).toEqual({ body: '```\n\n```\n', selection: { start: 4, end: 4 } });
  });

  it('selects the url placeholder in a new link', () => {
    const result = insertLink('see docs', { start: 4, end: 8 });
    expect(result.body).toBe('see [docs](https://)');
    expect(result.body.slice(result.selection.start, result.selection.end)).toBe('https://');
  });
});

describe('continueList', () => {
  it('continues bullets, checklists (unticked) and numbers on Enter', () => {
    expect(continueList('- a', '- a\n', 4)?.body).toBe('- a\n- ');
    expect(continueList('- [x] a', '- [x] a\n', 8)?.body).toBe('- [x] a\n- [ ] ');
    expect(continueList('2. b', '2. b\n', 5)).toEqual({ body: '2. b\n3. ', selection: { start: 8, end: 8 } });
  });

  it('ends the list when Enter is pressed on an empty item', () => {
    expect(continueList('- a\n- ', '- a\n- \n', 7)).toEqual({ body: '- a\n', selection: { start: 4, end: 4 } });
  });

  it('ignores ordinary typing and plain lines', () => {
    expect(continueList('- a', '- ab', 4)).toBeNull();
    expect(continueList('text', 'text\n', 5)).toBeNull();
  });
});

describe('EditHistory', () => {
  it('undoes and redoes, and a new edit clears redo', () => {
    const history = new EditHistory();
    history.push('a');
    history.push('ab');
    expect(history.undo('abc')).toBe('ab');
    expect(history.undo('ab')).toBe('a');
    expect(history.redo('a')).toBe('ab');
    history.push('ab');
    expect(history.canRedo).toBe(false);
  });
});
