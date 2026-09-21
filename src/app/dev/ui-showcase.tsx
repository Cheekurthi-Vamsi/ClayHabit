import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  BentoCard,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  ProgressBar,
  ProgressRing,
  Skeleton,
  Text,
} from '@/components/ui';
import { useAppTheme, type TypographyVariant } from '@/theme';

const typeScale: TypographyVariant[] = [
  'displayLarge',
  'displayMedium',
  'headlineLarge',
  'headlineMedium',
  'titleLarge',
  'titleMedium',
  'bodyLarge',
  'bodyMedium',
  'bodySmall',
  'labelLarge',
  'labelMedium',
  'caption',
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="labelLarge" color="textSecondary">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

export default function UiShowcase() {
  const theme = useAppTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Section title="Typography">
        <View style={{ gap: 6 }}>
          {typeScale.map((variant) => (
            <Text key={variant} variant={variant}>
              {variant}
            </Text>
          ))}
        </View>
      </Section>

      <Section title="Buttons">
        <View style={styles.row}>
          <Button label="Complete Task" icon="check" onPress={() => {}} />
          <Button label="Outline" variant="outline" onPress={() => {}} />
        </View>
        <View style={styles.row}>
          <Button label="Ghost" variant="ghost" onPress={() => {}} />
          <Button label="Loading" onPress={() => {}} loading />
          <Button label="Disabled" onPress={() => {}} disabled />
        </View>
        <View style={styles.row}>
          <IconButton name="plus" variant="filled" accessibilityLabel="Add" onPress={() => {}} />
          <IconButton name="bell" variant="muted" accessibilityLabel="Notifications" onPress={() => {}} />
          <IconButton name="more-horizontal" variant="ghost" accessibilityLabel="More" onPress={() => {}} />
        </View>
      </Section>

      <Section title="Cards & Bento">
        <View style={styles.row}>
          <BentoCard title="Streak" icon="zap" span="half" accentGradient={theme.gradients.primary}>
            <Text variant="headlineMedium">14 days</Text>
          </BentoCard>
          <BentoCard title="Focus" icon="clock" span="half" accentGradient={theme.gradients.mintCyan}>
            <Text variant="headlineMedium">42 min</Text>
          </BentoCard>
        </View>
        <Card>
          <Text variant="titleMedium">Plain card</Text>
          <Text variant="bodyMedium" color="textSecondary">
            Used for list rows and content blocks.
          </Text>
        </Card>
      </Section>

      <Section title="Progress">
        <View style={styles.row}>
          <ProgressRing progress={0.65} size={72}>
            <Text variant="titleMedium">65%</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 10 }}>
            <ProgressBar progress={0.3} />
            <ProgressBar progress={0.7} color={theme.colors.accentMint} />
          </View>
        </View>
      </Section>

      <Section title="Chips & Badges">
        <View style={styles.row}>
          <Chip label="Low" onPress={() => {}} />
          <Chip label="High" selected onPress={() => {}} />
          <Chip label="Work" icon="briefcase" onPress={() => {}} />
        </View>
        <View style={styles.row}>
          <Badge label="High priority" color="warning" />
          <Badge label="12 completed" color="success" />
        </View>
      </Section>

      <Section title="Empty, Error & Loading">
        <EmptyState icon="inbox" title="Nothing here yet" message="This is what an empty list looks like." />
        <ErrorState message="This is what an error state looks like." onRetry={() => {}} />
        <Skeleton height={56} radius={theme.radii.md} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
});
