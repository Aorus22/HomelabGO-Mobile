import * as React from 'react';
import { View, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { containersApi } from '@/services/api';

interface ContainerDetail {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    project_name: string;
    service_name: string;
    created?: number;
    // Add these fields if available from API inspect
    mounts?: { source: string; destination: string; type: string }[];
    env?: string[];
}

export default function ContainerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors } = useColorScheme();
    const [container, setContainer] = React.useState<ContainerDetail | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    const fetchContainer = async () => {
        try {
            // currently api.list() returns summary. We might need a specific get(id) endpoint.
            // For now, filtering from list or assuming we modify backend later. 
            // Actually, usually /containers/json is list, /containers/{id}/json is inspect.
            // Let's assume we have `containersApi.get(id)` or similar. 
            // If not, I'll implementing it or rely on list filtering for now.
            // Checking api.ts... it has 'list', 'start', 'stop', 'restart', 'logs'. 
            // I'll add 'get' to api.ts properly later. For now let's use list and find.
            // Wait, standard docker API has inspect. I should probably add it. 
            // For this iteration, I'll assume list contains basic info and I'll display that.
            const data = await containersApi.list();
            const found = data.find((c: any) => c.id === id || c.id.startsWith(id));
            setContainer(found || null);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load container details');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchContainer();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchContainer();
    };

    const handleAction = async (action: 'start' | 'stop' | 'restart' | 'pull' | 'recreate') => {
        if (!container) return;
        setActionLoading(action);
        try {
            if (action === 'start') await containersApi.start(container.id);
            else if (action === 'stop') await containersApi.stop(container.id);
            else if (action === 'restart') await containersApi.restart(container.id);
            else if (action === 'pull') {
                await containersApi.pull(container.id);
                Alert.alert('Success', 'Image pulled successfully');
            } else if (action === 'recreate') {
                await containersApi.recreate(container.id);
                Alert.alert('Success', 'Container recreated successfully');
            }
            fetchContainer();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'running': return 'bg-green-500';
            case 'exited': return 'bg-red-500';
            case 'restarting': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!container) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <Text>Container not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Stack.Screen options={{ title: 'Container Details', headerBackTitle: 'Back' }} />

            <ScrollView
                contentContainerClassName="p-4 gap-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Card */}
                <View className="bg-card border border-border rounded-xl p-4">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className={`w-4 h-4 rounded-full ${getStateColor(container.state)}`} />
                        <View className="flex-1">
                            <Text variant="title3" className="font-bold">{container.name}</Text>
                            <Text variant="caption1" color="tertiary" className="font-mono">{container.id.substring(0, 12)}</Text>
                        </View>
                    </View>

                    <View className="gap-2">
                        <View className="flex-row justify-between border-b border-border/50 pb-2">
                            <Text color="tertiary">Image</Text>
                            <Text className="font-medium">{container.image}</Text>
                        </View>
                        <View className="flex-row justify-between border-b border-border/50 pb-2">
                            <Text color="tertiary">Status</Text>
                            <Text className="font-medium capitalize">{container.status}</Text>
                        </View>
                        <View className="flex-row justify-between border-b border-border/50 pb-2">
                            <Text color="tertiary">Project</Text>
                            <Text className="font-medium">{container.project_name || '-'}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text color="tertiary">Service</Text>
                            <Text className="font-medium">{container.service_name || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Control Actions */}
                {/* Actions Grid */}
                {/* Actions Grid - 2x2 Layout */}
                {/* Actions Stack */}
                <View className="gap-3">
                    {/* Primary Control Row */}
                    <View className="flex-row gap-3">
                        {container.state !== 'running' ? (
                            <Button
                                className="flex-1 bg-green-600 rounded-lg active:opacity-90 py-4"
                                androidRootClassName="flex-1"
                                size="lg"
                                onPress={() => handleAction('start')}
                                disabled={!!actionLoading}
                            >
                                {actionLoading === 'start' ? <ActivityIndicator color="white" /> : (
                                    <View className="flex-row items-center justify-center">
                                        <MaterialCommunityIcons name="play" size={24} color="white" className="mr-2" />
                                        <Text className="text-white font-bold text-lg">Start</Text>
                                    </View>
                                )}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    className="flex-1 bg-red-600 rounded-lg active:opacity-90"
                                    androidRootClassName="flex-1"
                                    size="lg"
                                    onPress={() => handleAction('stop')}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'stop' ? <ActivityIndicator color="white" /> : (
                                        <View className="flex-row items-center justify-center">
                                            <MaterialCommunityIcons name="stop" size={20} color="white" className="mr-2" />
                                            <Text className="text-white font-bold">Stop</Text>
                                        </View>
                                    )}
                                </Button>
                                <Button
                                    className="flex-1 bg-amber-500 rounded-lg active:opacity-90"
                                    androidRootClassName="flex-1"
                                    size="lg"
                                    onPress={() => handleAction('restart')}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'restart' ? <ActivityIndicator color="white" /> : (
                                        <View className="flex-row items-center justify-center">
                                            <MaterialCommunityIcons name="restart" size={20} color="white" className="mr-2" />
                                            <Text className="text-white font-bold text-zinc-900">Restart</Text>
                                        </View>
                                    )}
                                </Button>
                            </>
                        )}
                    </View>

                    {/* Tools Row */}
                    {/* Tools Grid - Row 1 */}
                    {/* Tools Grid - Row 1 (Pull & Recreate) */}
                    <View className="flex-row gap-3">
                        <Button
                            className="flex-1 rounded-lg bg-blue-600 active:opacity-90"
                            androidRootClassName="flex-1"
                            disabled={!!actionLoading}
                            onPress={() => handleAction('pull' as any)}
                        >
                            {actionLoading === 'pull' ? <ActivityIndicator color="white" /> : (
                                <View className="flex-row items-center justify-center">
                                    <MaterialCommunityIcons name="download" size={20} color="white" className="mr-2" />
                                    <Text className="text-white font-semibold">Pull Image</Text>
                                </View>
                            )}
                        </Button>

                        <Button
                            className="flex-1 rounded-lg bg-red-600 active:opacity-90"
                            androidRootClassName="flex-1"
                            disabled={!!actionLoading}
                            onPress={() => Alert.alert(
                                'Recreate Container',
                                'Are you sure you want to recreate this container? This will stop and remove the current container and create a new one with the same configuration.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Recreate', style: 'destructive', onPress: () => handleAction('recreate' as any) }
                                ]
                            )}
                        >
                            {actionLoading === 'recreate' ? <ActivityIndicator color="white" /> : (
                                <View className="flex-row items-center justify-center">
                                    <MaterialCommunityIcons name="refresh" size={20} color="white" className="mr-2" />
                                    <Text className="text-white font-semibold">Recreate</Text>
                                </View>
                            )}
                        </Button>
                    </View>

                    {/* Tools Grid - Row 2 (Logs & Terminal) */}
                    <View className="flex-row gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 active:bg-zinc-300 dark:active:bg-zinc-700"
                            androidRootClassName="flex-1"
                            onPress={() => router.push({
                                pathname: '/containers/[id]/logs',
                                params: { id: container.id, name: container.name }
                            })}
                        >
                            <MaterialCommunityIcons name="text-box-outline" size={20} color={colors.foreground} className="mr-2" />
                            <Text className="font-semibold">Logs</Text>
                        </Button>

                        <Button
                            variant="secondary"
                            className="flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 active:bg-zinc-300 dark:active:bg-zinc-700"
                            androidRootClassName="flex-1"
                            onPress={() => router.push({
                                pathname: '/containers/[id]/exec',
                                params: { id: container.id, name: container.name }
                            })}
                        >
                            <MaterialCommunityIcons name="console-line" size={20} color={colors.foreground} className="mr-2" />
                            <Text className="font-semibold">Terminal</Text>
                        </Button>
                    </View>

                    {/* Tools Grid - Row 3 (Files) */}
                    <View className="flex-row gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 active:bg-zinc-300 dark:active:bg-zinc-700"
                            androidRootClassName="flex-1"
                            onPress={() => router.push({
                                pathname: '/containers/[id]/files',
                                params: { id: container.id }
                            })}
                        >
                            <MaterialCommunityIcons name="folder-multiple-outline" size={20} color={colors.foreground} className="mr-2" />
                            <Text className="font-semibold">Files</Text>
                        </Button>
                    </View>
                </View>

                {/* Environment Variables (Placeholder for now until Inspect API is ready) */}
                {/* 
                 <View className="bg-card border border-border rounded-xl p-4">
                    <Text variant="headline" className="mb-3">Environment</Text>
                     <Text className="text-muted-foreground italic">Details not available yet</Text>
                 </View> 
                 */}

            </ScrollView>
        </SafeAreaView >
    );
}
