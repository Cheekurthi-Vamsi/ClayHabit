import type { WeekdayMask } from '@/domain/entities/habit';
import type { HabitColor } from '@/theme/habit-palette';

export interface HabitTemplate {
  name: string;
  /** Catalog icon id; its emoji becomes the habit's text fallback. */
  icon: string;
  color: HabitColor;
  targetPerDay: number;
  daysOfWeek: WeekdayMask;
}

/** One-tap starting points on the New Habit screen. Every field stays editable. */
export const HABIT_TEMPLATES: readonly HabitTemplate[] = [
  { name: 'Drink water', icon: 'line:droplet', color: 'cyan', targetPerDay: 8, daysOfWeek: '1111111' },
  { name: 'Read 20 pages', icon: 'line:book', color: 'blue', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Meditate', icon: 'emoji:person-in-lotus-position', color: 'purple', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Workout', icon: 'line:barbell', color: 'pink', targetPerDay: 1, daysOfWeek: '1010100' },
  { name: 'Walk 10k steps', icon: 'line:walk', color: 'mint', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Sleep by 11 PM', icon: 'line:moon', color: 'purple', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Journal', icon: 'line:notebook', color: 'amber', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'No phone in bed', icon: 'line:device-mobile-off', color: 'pink', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Take vitamins', icon: 'emoji:pill', color: 'mint', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Stretch', icon: 'line:stretching', color: 'cyan', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Learn a language', icon: 'line:language', color: 'blue', targetPerDay: 1, daysOfWeek: '1111100' },
  { name: 'Practice guitar', icon: 'emoji:guitar', color: 'amber', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Gratitude', icon: 'emoji:folded-hands', color: 'pink', targetPerDay: 3, daysOfWeek: '1111111' },
  { name: 'Eat veggies', icon: 'emoji:green-salad', color: 'mint', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Floss', icon: 'line:dental', color: 'cyan', targetPerDay: 1, daysOfWeek: '1111111' },
  { name: 'Save money', icon: 'line:pig-money', color: 'amber', targetPerDay: 1, daysOfWeek: '1111100' },
];
