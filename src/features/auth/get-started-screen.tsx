import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

import { Rise } from './auth-visuals';

/** images/get started light.jpg with its own button cut off (720 × 970); our button replaces it. */
const ART = require('../../../assets/images/onboarding/get-started.jpg');
const ART_RATIO = 720 / 970;
/** The art's own page colour, so the image edges disappear into the screen. */
const PAGE = '#F8FAFD';
const ACTIONS_HEIGHT = 120;

/**
 * The first thing a new install shows: the "Small steps lead to big changes"
 * art and one button on to sign-in. The art is a light scene, so this page
 * stays light whatever the theme.
 */
export function GetStartedScreen({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();

  const available = height - insets.top - insets.bottom - ACTIONS_HEIGHT;
  const artWidth = Math.min(width, available * ART_RATIO, 560);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="dark" />
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(500)} style={styles.art}>
        <Image
          source={ART}
          style={{ width: artWidth, height: artWidth / ART_RATIO }}
          contentFit="contain"
          accessibilityLabel="Small steps lead to big changes. A student with a laptop climbs a staircase of books toward a flag."
        />
      </Animated.View>
      <Rise order={3} style={styles.actions}>
        <Button
          label="Get Started"
          trailingIcon="arrow-right"
          size="lg"
          fullWidth
          onPress={onContinue}
          accessibilityHint="Continues to sign in"
        />
      </Rise>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAGE,
  },
  art: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    paddingHorizontal: 32,
    paddingTop: 12,
  },
});
