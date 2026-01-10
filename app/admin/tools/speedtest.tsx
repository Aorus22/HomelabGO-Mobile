import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

type Phase = 'idle' | 'testing' | 'done';

export default function SpeedtestScreen() {
    const { colors } = useColorScheme();
    const [phase, setPhase] = React.useState<Phase>('idle');
    const [result, setResult] = React.useState<{
        download: number;
        upload: number;
        ping: number;
        server: string;
    } | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const runSpeedtest = async () => {
        setPhase('testing');
        setResult(null);
        setError(null);

        try {
            const data = await adminApi.runSpeedtest();
            setResult(data);
            setPhase('done');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Speedtest failed');
            setPhase('idle');
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: 'Speedtest' }} />
            <ScrollView
                className="flex-1 bg-background"
                contentContainerClassName="p-4"
            >
                {/* Test Button / Loading */}
                {phase === 'idle' && (
                    <View className="items-center py-12">
                        <View className="w-32 h-32 rounded-full bg-primary/20 items-center justify-center mb-6">
                            <MaterialCommunityIcons name="speedometer" size={56} color={colors.primary} />
                        </View>
                        <Button
                            variant="primary"
                            onPress={runSpeedtest}
                            className="px-8"
                        >
                            <Text className="text-white font-bold">Start Speedtest</Text>
                        </Button>
                    </View>
                )}

                {phase === 'testing' && (
                    <View className="items-center py-16">
                        <ActivityIndicator size="large" />
                        <Text className="mt-4 font-semibold">Running speedtest...</Text>
                        <Text variant="caption1" color="tertiary" className="mt-2 text-center">
                            This may take 30-60 seconds
                        </Text>
                    </View>
                )}

                {/* Results */}
                {result && phase === 'done' && (
                    <View className="gap-4">
                        {/* Download Card */}
                        <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                            <View className="flex-row items-center gap-3 mb-2">
                                <MaterialCommunityIcons name="download" size={28} color="#3b82f6" />
                                <Text variant="body" color="tertiary">Download</Text>
                            </View>
                            <Text className="text-4xl font-bold text-blue-500">
                                {result.download.toFixed(2)}
                                <Text className="text-lg font-normal"> Mbps</Text>
                            </Text>
                        </View>

                        {/* Upload Card */}
                        <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                            <View className="flex-row items-center gap-3 mb-2">
                                <MaterialCommunityIcons name="upload" size={28} color="#10b981" />
                                <Text variant="body" color="tertiary">Upload</Text>
                            </View>
                            <Text className="text-4xl font-bold text-green-500">
                                {result.upload.toFixed(2)}
                                <Text className="text-lg font-normal"> Mbps</Text>
                            </Text>
                        </View>

                        {/* Ping Card */}
                        <View className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                            <View className="flex-row items-center gap-3 mb-2">
                                <MaterialCommunityIcons name="timer-outline" size={28} color="#f59e0b" />
                                <Text variant="body" color="tertiary">Ping</Text>
                            </View>
                            <Text className="text-4xl font-bold text-yellow-500">
                                {result.ping.toFixed(0)}
                                <Text className="text-lg font-normal"> ms</Text>
                            </Text>
                        </View>

                        {/* Server Info */}
                        {result.server && (
                            <View className="bg-card border border-border rounded-xl p-4 flex-row items-center gap-3">
                                <MaterialCommunityIcons name="server" size={20} color={colors.grey} />
                                <View className="flex-1">
                                    <Text variant="caption2" color="tertiary">Server</Text>
                                    <Text variant="body">{result.server}</Text>
                                </View>
                            </View>
                        )}

                        {/* Test Again */}
                        <Button
                            variant="secondary"
                            onPress={() => {
                                setPhase('idle');
                                setResult(null);
                            }}
                            className="mt-4"
                        >
                            <Text>Test Again</Text>
                        </Button>
                    </View>
                )}

                {/* Error */}
                {error && (
                    <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mt-4">
                        <Text className="text-red-500 text-center mb-3">{error}</Text>
                        <Button
                            variant="secondary"
                            onPress={() => {
                                setPhase('idle');
                                setError(null);
                            }}
                        >
                            <Text>Try Again</Text>
                        </Button>
                    </View>
                )}
            </ScrollView>
        </>
    );
}
