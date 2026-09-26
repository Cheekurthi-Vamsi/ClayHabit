import { useState } from 'react';
import { Tabs } from 'expo-router';

import { FloatingDock, type DockTabMeta } from '@/components/navigation/floating-dock';
import { FinanceQuickAddSheet } from '@/features/finance/finance-quick-add-sheet';
import { useAppTheme } from '@/theme';

const FINANCE_TABS: DockTabMeta = {
  index: { label: 'Overview', icon: 'pie-chart' },
  money: { label: 'Money', icon: 'list' },
  goals: { label: 'Goals', icon: 'target' },
  stats: { label: 'Stats', icon: 'bar-chart-2' },
};

/** The finance workspace: its own tabs and dock, pushed over the productivity tabs. */
export default function FinanceLayout() {
  const theme = useAppTheme();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <FloatingDock
            {...props}
            tabs={FINANCE_TABS}
            createHint="Opens options to add an expense, income, savings, budget or goal"
            createOpen={addOpen}
            onCreate={() => setAddOpen(true)}
          />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Overview' }} />
        <Tabs.Screen name="money" options={{ title: 'Money' }} />
        <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      </Tabs>
      <FinanceQuickAddSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
