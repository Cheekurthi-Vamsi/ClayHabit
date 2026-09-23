import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';

/** True when the system asks for reduced motion, or the person turned on Settings → Reduce animations. */
export function useReduceMotion(): boolean {
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const appReduceMotion = useSettingsStore((state) => state.reduceMotion);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setSystemReduceMotion(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return systemReduceMotion || appReduceMotion;
}
