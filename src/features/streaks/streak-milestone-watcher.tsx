import { Celebration } from '@/components/ui';
import { pendingMilestone } from '@/domain/services/streak-engine';
import { useSettingsStore } from '@/store/settings-store';

import { useOverallStreak } from './hooks';

/**
 * Renders a one-off celebration when the app-wide streak reaches a new
 * milestone. The pending milestone is derived from data on each render,
 * and only recorded as celebrated once the animation has played.
 */
export function StreakMilestoneWatcher() {
  const { data: streak } = useOverallStreak();
  const lastCelebrated = useSettingsStore((state) => state.lastCelebratedStreak);
  const setLastCelebrated = useSettingsStore((state) => state.setLastCelebratedStreak);

  const milestone = streak ? pendingMilestone(streak.current, lastCelebrated) : null;
  if (!milestone) return null;

  return (
    <Celebration
      key={milestone}
      title={`🔥 ${milestone}-day streak!`}
      subtitle="You showed up every day. Keep the chain going."
      onDone={() => setLastCelebrated(milestone)}
    />
  );
}
