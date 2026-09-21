import {
  EMOJI_ICONS,
  ICON_CATEGORIES,
  LINE_ICONS,
  type HabitIconCategory,
  type HabitIconDef,
  type HabitIconKind,
} from './catalog';

const BY_ID = new Map<string, HabitIconDef>([...LINE_ICONS, ...EMOJI_ICONS].map((def) => [def.id, def]));

const CATEGORY_LABEL = new Map(ICON_CATEGORIES.map(({ key, label }) => [key, label.toLowerCase()]));

export function getHabitIcon(id: string | null | undefined): HabitIconDef | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

export function iconsOfKind(kind: HabitIconKind): readonly HabitIconDef[] {
  return kind === 'line' ? LINE_ICONS : EMOJI_ICONS;
}

export function iconsInCategory(kind: HabitIconKind, category: HabitIconCategory): HabitIconDef[] {
  return iconsOfKind(kind).filter((def) => def.category === category);
}

/**
 * Icons whose label, keywords, category or source name contain every word of
 * `query` — so "cold shower" and "no phone" both find what you'd expect.
 */
export function searchHabitIcons(kind: HabitIconKind, query: string): HabitIconDef[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...iconsOfKind(kind)];

  return iconsOfKind(kind).filter((def) => {
    const haystack = [
      def.label,
      def.keywords,
      def.source.replace(/-/g, ' '),
      CATEGORY_LABEL.get(def.category) ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
