import { addMonthsToDate, daysBetween, wholeMonthsBetween } from './month';

/**
 * Savings-plan arithmetic. These are projections from the person's own
 * numbers, never promises: callers should phrase them as "at your current
 * contribution rate…", and nothing here assumes interest or returns.
 */

export interface SavingsPlanFigures {
  targetMinor: number;
  savedMinor: number;
  /** Local `YYYY-MM-DD`, or null for an open-ended plan. */
  targetDate: string | null;
  today: string;
  /** What the person plans to (or currently does) put in each month. */
  monthlyContributionMinor?: number | null;
}

export interface SavingsProjection {
  remainingMinor: number;
  /** 0–1. */
  progress: number;
  isComplete: boolean;
  /** Days until the target date (0 once it has passed); null without a date. */
  daysRemaining: number | null;
  isPastTarget: boolean;
  /** Monthly contributions left before the target date (at least 1 while a date is set). */
  monthsRemaining: number | null;
  requiredMonthlyMinor: number | null;
  requiredWeeklyMinor: number | null;
  /** When the remaining amount is covered at `monthlyContributionMinor`. */
  projectedCompletion: string | null;
  /** Whether the monthly contribution covers what's required; null when either is unknown. */
  onTrack: boolean | null;
}

export function projectSavings(plan: SavingsPlanFigures): SavingsProjection {
  const remainingMinor = Math.max(0, plan.targetMinor - plan.savedMinor);
  const progress = plan.targetMinor > 0 ? Math.min(1, Math.max(0, plan.savedMinor / plan.targetMinor)) : 0;
  const isComplete = plan.targetMinor > 0 && remainingMinor === 0;

  let daysRemaining: number | null = null;
  let monthsRemaining: number | null = null;
  let requiredMonthlyMinor: number | null = null;
  let requiredWeeklyMinor: number | null = null;
  let isPastTarget = false;

  if (plan.targetDate) {
    const days = daysBetween(plan.today, plan.targetDate);
    isPastTarget = days < 0;
    daysRemaining = Math.max(0, days);
    // Whatever is left in the current month counts as one more chance to contribute.
    monthsRemaining = Math.max(1, wholeMonthsBetween(plan.today, plan.targetDate));
    const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
    requiredMonthlyMinor = isComplete ? 0 : Math.ceil(remainingMinor / monthsRemaining);
    requiredWeeklyMinor = isComplete ? 0 : Math.ceil(remainingMinor / weeksRemaining);
  }

  const monthly = plan.monthlyContributionMinor ?? null;
  let projectedCompletion: string | null = null;
  if (isComplete) {
    projectedCompletion = plan.today;
  } else if (monthly !== null && monthly > 0) {
    projectedCompletion = addMonthsToDate(plan.today, Math.ceil(remainingMinor / monthly));
  }

  const onTrack =
    isComplete ? true : monthly !== null && requiredMonthlyMinor !== null ? monthly >= requiredMonthlyMinor : null;

  return {
    remainingMinor,
    progress,
    isComplete,
    daysRemaining,
    isPastTarget,
    monthsRemaining,
    requiredMonthlyMinor,
    requiredWeeklyMinor,
    projectedCompletion,
    onTrack,
  };
}
