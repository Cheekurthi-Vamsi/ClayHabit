import { useEffect } from 'react';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DATABASE_NAME, migrateDatabase } from '@/data/db/migrate';
import { seedIfEmpty } from '@/data/repositories/task-repository';
import { NotificationResponseHandler } from '@/features/tasks/notification-response-handler';
import { queryClient } from '@/lib/query-client';
import { configureNotificationHandler } from '@/lib/notifications/notification-service';
import { AppThemeProvider, useResolvedScheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

async function onInitDatabase(db: SQLiteDatabase) {
  await migrateDatabase(db);
  await seedIfEmpty(db);
}

function RootNavigation() {
  const scheme = useResolvedScheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NotificationResponseHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal/new-task"
          options={{ presentation: 'modal', headerShown: true, title: 'New Task' }}
        />
        <Stack.Screen
          name="modal/new-goal"
          options={{ presentation: 'modal', headerShown: true, title: 'New Goal' }}
        />
        <Stack.Screen
          name="modal/new-event"
          options={{ presentation: 'modal', headerShown: true, title: 'New Event' }}
        />
        <Stack.Screen
          name="dev/ui-showcase"
          options={{ headerShown: true, title: 'UI Showcase' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={onInitDatabase}>
          <QueryClientProvider client={queryClient}>
            <AppThemeProvider>
              <RootNavigation />
            </AppThemeProvider>
          </QueryClientProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
