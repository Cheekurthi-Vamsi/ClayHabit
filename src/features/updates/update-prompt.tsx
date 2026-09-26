import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';

import { checkForUpdate, skipVersion, type AvailableUpdate } from '@/lib/updates/update-check';

/** Offers a newer version: download it (the browser installs it over this one, keeping the data), later, or skip it. */
export function offerUpdate(update: AvailableUpdate): void {
  const notes = update.notes ? `\n\n${update.notes.slice(0, 400)}` : '';
  Alert.alert(`ClayHabbit ${update.version} is out`, `Download it and install it over this version. Your data stays.${notes}`, [
    { text: 'Skip this version', style: 'destructive', onPress: () => void skipVersion(update.version) },
    { text: 'Later', style: 'cancel' },
    { text: 'Download', onPress: () => void Linking.openURL(update.apkUrl) },
  ]);
}

/**
 * Mounted once the app is open: checks GitHub for a newer release at most
 * once a day, quietly. Offline or rate-limited simply means "no news".
 */
export function UpdatePrompt() {
  useEffect(() => {
    let cancelled = false;
    // Let the app settle first; an update isn't the first thing anyone needs to see.
    const timer = setTimeout(() => {
      checkForUpdate()
        .then((update) => {
          if (update && !cancelled) offerUpdate(update);
        })
        .catch(() => {});
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return null;
}
