import { HABIT_TEMPLATES } from '../habit-templates';
import { EMOJI_ICONS, ICON_CATEGORIES, LINE_ICONS } from '../icons/catalog';
import { ICON_SVGS } from '../icons/icon-svgs.generated';
import { getHabitIcon, iconsInCategory, searchHabitIcons } from '../icons/lookup';

const ALL = [...LINE_ICONS, ...EMOJI_ICONS];

describe('habit icon catalog', () => {
  it('has unique ids', () => {
    const ids = ALL.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has extracted SVG markup for every icon (re-run the extract script if this fails)', () => {
    const missing = ALL.filter((def) => !ICON_SVGS[def.id]).map((def) => def.id);
    expect(missing).toEqual([]);
    for (const def of ALL) {
      expect(ICON_SVGS[def.id]).toMatch(/^<svg [^>]*viewBox="[\d.\s-]+"[^>]*>.*<\/svg>$/s);
    }
  });

  it('ships no SVG the app does not use', () => {
    const known = new Set(ALL.map((def) => def.id));
    expect(Object.keys(ICON_SVGS).filter((id) => !known.has(id))).toEqual([]);
  });

  it('draws line icons with currentColor so they can be tinted', () => {
    for (const def of LINE_ICONS) {
      expect(ICON_SVGS[def.id]).toContain('currentColor');
    }
  });

  it('gives every category at least a few icons of each kind', () => {
    for (const { key } of ICON_CATEGORIES) {
      expect(iconsInCategory('line', key).length).toBeGreaterThanOrEqual(4);
      expect(iconsInCategory('emoji', key).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('gives every icon a plain-text emoji fallback', () => {
    for (const def of ALL) {
      expect(def.emoji.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('getHabitIcon', () => {
  it('resolves known ids and rejects unknown or empty ones', () => {
    expect(getHabitIcon('line:run')?.label).toBe('Run');
    expect(getHabitIcon('emoji:fire')?.emoji).toBe('🔥');
    expect(getHabitIcon('line:does-not-exist')).toBeNull();
    expect(getHabitIcon(null)).toBeNull();
    expect(getHabitIcon(undefined)).toBeNull();
  });
});

describe('searchHabitIcons', () => {
  it('matches labels, keywords and source names', () => {
    expect(searchHabitIcons('line', 'water').map((def) => def.id)).toContain('line:droplet');
    expect(searchHabitIcons('line', 'gym').map((def) => def.id)).toContain('line:barbell');
    expect(searchHabitIcons('emoji', 'lotus').map((def) => def.id)).toContain('emoji:person-in-lotus-position');
  });

  it('requires every word to match, case-insensitively', () => {
    const results = searchHabitIcons('line', 'NO phone');
    expect(results.map((def) => def.id)).toEqual(['line:device-mobile-off']);
  });

  it('matches category names', () => {
    const fitness = searchHabitIcons('line', 'fitness');
    expect(fitness.length).toBe(iconsInCategory('line', 'fitness').length);
  });

  it('returns everything for a blank query and nothing for nonsense', () => {
    expect(searchHabitIcons('emoji', '   ')).toHaveLength(EMOJI_ICONS.length);
    expect(searchHabitIcons('line', 'zzzqqq')).toEqual([]);
  });
});

describe('habit templates', () => {
  it('only reference icons that exist', () => {
    for (const template of HABIT_TEMPLATES) {
      expect(getHabitIcon(template.icon)).not.toBeNull();
    }
  });

  it('have unique names, sensible goals and valid schedules', () => {
    expect(new Set(HABIT_TEMPLATES.map((t) => t.name)).size).toBe(HABIT_TEMPLATES.length);
    for (const template of HABIT_TEMPLATES) {
      expect(template.targetPerDay).toBeGreaterThanOrEqual(1);
      expect(template.daysOfWeek).toMatch(/^[01]{7}$/);
      expect(template.daysOfWeek).toContain('1');
    }
  });
});
