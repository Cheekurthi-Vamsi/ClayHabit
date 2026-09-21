import type { CategoryColor } from '@/domain/finance/entities';

export interface PlanTemplate {
  key: string;
  name: string;
  emoji: string;
  color: CategoryColor;
}

/** Starting points from the spec's list; every field stays editable. */
export const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  { key: 'emergency', name: 'Emergency fund', emoji: '🛟', color: 'mint' },
  { key: 'laptop', name: 'New laptop', emoji: '💻', color: 'blue' },
  { key: 'vacation', name: 'Vacation', emoji: '🏖️', color: 'cyan' },
  { key: 'education', name: 'Education', emoji: '🎓', color: 'purple' },
  { key: 'car', name: 'Car', emoji: '🚗', color: 'amber' },
  { key: 'house', name: 'House', emoji: '🏡', color: 'pink' },
  { key: 'investment', name: 'Investment', emoji: '📈', color: 'blue' },
];

export const PLAN_EMOJIS = ['🎯', '🛟', '💻', '🏖️', '🎓', '🚗', '🏡', '📈', '💍', '👶', '🐶', '🎸', '📱', '✈️', '🏥', '🎁'];
