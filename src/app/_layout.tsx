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

import { migrateDatabase } from '@/data/db/migrate';
import { seedIfEmpty } from '@/data/repositories/task-repository';
import { AuthGate } from '@/features/auth/auth-gate';
import { AuthProvider } from '@/features/auth/auth-provider';
import { AppLockGate } from '@/features/security/app-lock-gate';
import { NotificationResponseHandler } from '@/features/tasks/notification-response-handler';
import { queryClient } from '@/lib/query-client';
import { configureNotificationHandler } from '@/lib/notifications/notification-service';
import { useSettingsHydrated } from '@/store/settings-store';
import { AppThemeProvider, useAppTheme, useResolvedScheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

async function onInitDatabase(db: SQLiteDatabase) {
  await migrateDatabase(db);
  await seedIfEmpty(db);
}

function RootNavigation() {
  const scheme = useResolvedScheme();
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NotificationResponseHandler />
      <AppLockGate>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.primary,
            headerTitleStyle: {
              fontFamily: theme.typography.titleLarge.fontFamily,
              color: theme.colors.textPrimary,
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          {/* A workspace switch, not a drill-down: fade rather than slide. */}
          <Stack.Screen name="finance" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="modal/transaction"
            options={{ presentation: 'modal', headerShown: true, title: 'Add expense' }}
          />
          <Stack.Screen
            name="modal/starting-balance"
            options={{ presentation: 'modal', headerShown: true, title: 'Starting balance' }}
          />
          <Stack.Screen name="modal/budget" options={{ presentation: 'modal', headerShown: true, title: 'Budget' }} />
          <Stack.Screen
            name="modal/savings-plan"
            options={{ presentation: 'modal', headerShown: true, title: 'Savings plan' }}
          />
          <Stack.Screen
            name="modal/savings-entry"
            options={{ presentation: 'modal', headerShown: true, title: 'Savings' }}
          />
          <Stack.Screen name="modal/category" options={{ presentation: 'modal', headerShown: true, title: 'Category' }} />
          <Stack.Screen
            name="modal/new-task"
            options={{ presentation: 'modal', headerShown: true, title: 'New Task' }}
          />
          <Stack.Screen
            name="modal/new-goal"
            options={{ presentation: 'modal', headerShown: true, title: 'New Goal' }}
          />
          <Stack.Screen
            name="modal/new-habit"
            options={{ presentation: 'modal', headerShown: true, title: 'New Habit' }}
          />
          <Stack.Screen
            name="modal/new-event"
            options={{ presentation: 'modal', headerShown: true, title: 'New Event' }}
          />
          <Stack.Screen name="security/set-pin" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="dev/ui-showcase"
            options={{ headerShown: true, title: 'UI Showcase' }}
          />
        </Stack>
      </AppLockGate>
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

  const settingsHydrated = useSettingsHydrated();
  const ready = (fontsLoaded || Boolean(fontError)) && settingsHydrated;

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
        <AuthProvider>
          <AppThemeProvider>
            {/* Signed out → sign-in screen. Signed in → that account's own database. */}
            <AuthGate>
              {(databaseName) => (
                <SQLiteProvider key={databaseName} databaseName={databaseName} onInit={onInitDatabase}>
                  <QueryClientProvider client={queryClient}>
                    <RootNavigation />
                  </QueryClientProvider>
                </SQLiteProvider>
              )}
            </AuthGate>
          </AppThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
