import { useState } from 'react';
import { Tabs } from 'expo-router';

import { FloatingDock } from '@/components/navigation/floating-dock';
import { QuickAddSheet } from '@/features/quick-add/quick-add-sheet';
import { useAppTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useAppTheme();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <FloatingDock {...props} onCreate={() => setCreateOpen(true)} createOpen={createOpen} />
        )}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
        <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
        <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      </Tabs>
      <QuickAddSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
