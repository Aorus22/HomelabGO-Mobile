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
  const [isServerConfigured, setIsServerConfigured] = React.useState(true); // Default true to avoid flash
  const { isAuthenticated, isLoading, loadToken } = useAuth();
  const segments = useSegments();

  React.useEffect(() => {
    // Check server config
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
    const inServerConfig = segments[0] === 'server-config';

    if (inServerConfig && isServerConfigured && !isAuthenticated) {
      //If server is configured, move to login. 
      //But user might want to change config, so we should allow staying if manually navigated?
      //For now, auto redirect to login if configured.
      router.replace('/(auth)/login');
    } else if (!isAuthenticated && inTabsGroup) {
      // User is not authenticated but is in protected area
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but is in auth area
      router.replace('/(tabs)/dashboard');
    } else if (!isAuthenticated && !segments[0]) {
      // User is at root and not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !segments[0]) {
      // User is at root and authenticated
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, isLoading, segments, isServerConfigured]);

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
                </Stack>
              </AuthHandler>
            </AuthProvider>
          </NavThemeProvider>
        </ActionSheetProvider>
      </GestureHandlerRootView>
    </>
  );
}
