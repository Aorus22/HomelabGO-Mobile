import '@/global.css';

import * as React from 'react';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { NAV_THEME } from '@/theme';
import { AuthProvider, useAuth } from '@/context/auth';

export {
  ErrorBoundary,
} from 'expo-router';

function AuthHandler({ children }: { children: React.ReactNode }) {
  const [isServerConfigured, setIsServerConfigured] = React.useState(true);
  const { isAuthenticated, isLoading, user, loadToken } = useAuth();
  const segments = useSegments();

  React.useEffect(() => {
    import('@/services/api').then(({ serverStorage }) => {
      serverStorage.get().then(url => {
        if (!url) {
          setIsServerConfigured(false);
          router.replace('/server-config');
        } else {
          setIsServerConfigured(true);
          loadToken();
        }
      });
    });
  }, []);

  React.useEffect(() => {
    if (isLoading || !isServerConfigured) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inAdminGroup = segments[0] === '(admin)';
    const inServerConfig = segments[0] === 'server-config';

    const isAdmin = user?.role === 'admin';

    // Allow access to server-config page always
    if (inServerConfig) {
      return;
    }

    if (!isAuthenticated && (inTabsGroup || inAdminGroup)) {
      // User is not authenticated but is in protected area
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but is in auth area - redirect based on role
      if (isAdmin) {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } else if (!isAuthenticated && !segments[0]) {
      // User is at root and not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !segments[0]) {
      // User is at root and authenticated - redirect based on role
      if (isAdmin) {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } else if (isAuthenticated && isAdmin && inTabsGroup) {
      // Admin is in user tabs - redirect to admin
      router.replace('/(admin)/dashboard');
    } else if (isAuthenticated && !isAdmin && inAdminGroup) {
      // Non-admin is in admin area - redirect to user tabs
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isLoading, segments, isServerConfigured, user]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme();

  return (
    <>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ActionSheetProvider>
          <NavThemeProvider value={NAV_THEME[colorScheme]}>
            <AuthProvider>
              <AuthHandler>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(admin)" />
                </Stack>
              </AuthHandler>
            </AuthProvider>
          </NavThemeProvider>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    </>
  );
}

