import * as React from 'react';
import { View, ScrollView, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Toggle } from '@/components/nativewindui/Toggle';
import { ThemeToggle } from '@/components/nativewindui/ThemeToggle';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuth } from '@/context/auth';
import { cloudflareApi } from '@/services/api';

export default function SettingsScreen() {
    const { colors, isDarkColorScheme } = useColorScheme();
    const { user, logout } = useAuth();

    const [cfConfigured, setCfConfigured] = React.useState(false);
    const [cfToken, setCfToken] = React.useState('');
    const [cfRunning, setCfRunning] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const fetchCloudflareStatus = async () => {
        try {
            const [config, status] = await Promise.all([
                cloudflareApi.getConfig().catch(() => ({ configured: false })),
                cloudflareApi.getStatus().catch(() => ({ running: false })),
            ]);
            setCfConfigured(config.configured);
            setCfRunning(status.running);
        } catch (error) {
            console.error('Failed to fetch Cloudflare status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchCloudflareStatus();
    }, []);

    const handleSaveCloudflare = async () => {
        if (!cfToken.trim()) {
            Alert.alert('Error', 'Please enter a tunnel token');
            return;
        }

        setIsSaving(true);
        try {
            await cloudflareApi.updateConfig(cfToken.trim());
            setCfToken('');
            setCfConfigured(true);
            Alert.alert('Success', 'Cloudflare tunnel deployed');
            fetchCloudflareStatus();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="p-4 gap-4"
        >
            {/* User Info */}
            <View className="bg-card border border-border rounded-xl p-4">
                <Text variant="footnote" color="tertiary" className="mb-3">Account</Text>
                <View className="flex-row items-center gap-4">
                    <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center">
                        <Text className="text-primary font-bold text-lg">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View>
                        <Text variant="body" className="font-semibold">{user?.username || 'User'}</Text>
                        <Text variant="caption1" color="tertiary" className="capitalize">{user?.role || 'user'}</Text>
                    </View>
                </View>
            </View>

            {/* Theme */}
            <View className="bg-card border border-border rounded-xl p-4">
                <Text variant="footnote" color="tertiary" className="mb-3">Appearance</Text>
                <View className="flex-row items-center justify-between">
                    <Text>Dark Mode</Text>
                    <ThemeToggle />
                </View>
            </View>

            {/* Cloudflare */}
            <View className="bg-card border border-border rounded-xl p-4">
                <Text variant="footnote" color="tertiary" className="mb-3">Cloudflare Tunnel</Text>

                {isLoading ? (
                    <ActivityIndicator />
                ) : (
                    <>
                        <View className="flex-row items-center justify-between mb-4">
                            <Text>Status</Text>
                            <View className="flex-row items-center gap-2">
                                <View className={`w-2 h-2 rounded-full ${cfRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                                <Text color={cfRunning ? undefined : 'tertiary'}>
                                    {cfRunning ? 'Running' : 'Not Running'}
                                </Text>
                            </View>
                        </View>

                        <Text variant="footnote" className="mb-2 text-muted-foreground">
                            Tunnel Token
                        </Text>
                        <TextInput
                            value={cfToken}
                            onChangeText={setCfToken}
                            placeholder={cfConfigured ? '••••••••••••••••' : 'Enter your tunnel token'}
                            placeholderTextColor={colors.grey}
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry
                            className="bg-background border border-border rounded-xl px-4 py-3 text-foreground mb-4"
                            style={{ color: colors.foreground }}
                        />

                        <Button
                            onPress={handleSaveCloudflare}
                            disabled={isSaving || !cfToken.trim()}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-white">{cfConfigured ? 'Update' : 'Save'} & Deploy</Text>
                            )}
                        </Button>
                    </>
                )}
            </View>

            {/* Logout */}
            <Button variant="secondary" onPress={handleLogout} className="mt-4">
                <Text className="text-destructive">Logout</Text>
            </Button>

            {/* Version */}
            <Text variant="caption1" color="tertiary" className="text-center mt-4">
                HomelabGO v1.0.0
            </Text>
        </ScrollView>
    );
}
