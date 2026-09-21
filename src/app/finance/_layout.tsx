import { Tabs, useRouter } from 'expo-router';

import { FloatingDock, type DockTabMeta } from '@/components/navigation/floating-dock';
import { useAppTheme } from '@/theme';

const FINANCE_TABS: DockTabMeta = {
  index: { label: 'Overview', icon: 'pie-chart' },
  money: { label: 'Money', icon: 'list' },
};

/** The finance workspace: its own tabs and dock, pushed over the productivity tabs. */
export default function FinanceLayout() {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => (
        <FloatingDock
          {...props}
          tabs={FINANCE_TABS}
          accentGradient={theme.gradients.finance}
          accentColor={theme.colors.financeText}
          createGradient={theme.gradients.finance}
          createHint="Adds an expense or income"
          createOpen={false}
          onCreate={() => router.push('/modal/transaction')}
        />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Overview' }} />
      <Tabs.Screen name="money" options={{ title: 'Money' }} />
    </Tabs>
  );
}
