import * as React from 'react';
import { View, ScrollView, RefreshControl, Alert, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { deploymentsApi, containersApi } from '@/services/api';

interface DeploymentDetail {
    id: number;
    project_name: string;
    raw_yaml: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Container {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    project_name: string;
    service_name: string;
}

export default function DeploymentDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors } = useColorScheme();

    const [deployment, setDeployment] = React.useState<DeploymentDetail | null>(null);
    const [containers, setContainers] = React.useState<Container[]>([]);

    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    const fetchData = async () => {
        try {
            if (!id) return;
            const depId = parseInt(id, 10);

            // Parallel fetch
            const [depData, allContainers] = await Promise.all([
                deploymentsApi.get(depId),
                containersApi.list()
            ]);

            setDeployment(depData);

            // Filter containers for this project
            const projectContainers = allContainers.filter(
                c => c.project_name === depData.project_name
            );
            setContainers(projectContainers);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load deployment details');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDeploy = async () => {
        if (!deployment) return;
        setActionLoading('deploy');
        try {
            const result = await deploymentsApi.deploy(deployment.id);
            Alert.alert('Success', `Deployed ${result.containers?.length || 0} containers`);
            fetchData();
        } catch (error) {
            Alert.alert('Deploy Failed', error instanceof Error ? error.message : 'Failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleStop = async () => {
        if (!deployment) return;
        setActionLoading('stop');
        try {
            await deploymentsApi.stop(deployment.id);
            Alert.alert('Success', 'Deployment stopped');
            fetchData();
        } catch (error) {
            Alert.alert('Stop Failed', error instanceof Error ? error.message : 'Failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemove = () => {
        if (!deployment) return;
        Alert.alert(
            'Remove Deployment',
            `Remove "${deployment.project_name}"? This will delete the project configuration and containers.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading('delete');
                        try {
                            await deploymentsApi.delete(deployment.id);
                            router.back();
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove');
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleEdit = () => {
        if (!deployment) return;
        router.push({
            pathname: '/deployments/new',
            params: {
                mode: 'edit',
                id: deployment.id,
                initialProjectName: deployment.project_name,
                initialYaml: deployment.raw_yaml
            }
        });
    };

    const getStateColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'bg-green-500';
            case 'stopped':
                return 'bg-red-500';
            case 'deploying':
                return 'bg-blue-500';
            case 'error':
                return 'bg-red-700';
            default:
                return 'bg-gray-500';
        }
    };

    const getContainerStateBadgeColor = (state: string) => {
        switch (state) {
            case 'running':
                return 'border-green-500 text-green-500';
            case 'exited':
                return 'border-red-500 text-red-500';
            case 'restarting':
                return 'border-orange-500 text-orange-500';
            case 'paused':
                return 'border-gray-500 text-gray-500';
            default:
                return 'border-gray-500 text-gray-500';
        }
    };

    const handleStart = async () => {
        if (!deployment) return;
        setActionLoading('start');
        try {
            const result = await deploymentsApi.start(deployment.id);
            Alert.alert('Success', result.message);
            fetchData();
        } catch (error) {
            Alert.alert('Start Failed', error instanceof Error ? error.message : 'Failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading || !deployment) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    const isRunning = deployment.status === 'running';
    const isStopped = deployment.status === 'stopped' || deployment.status === 'exited' || deployment.status === 'created' || deployment.status === 'failed';
    const isPending = deployment.status === 'pending'; // Initial state

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Stack.Screen options={{ title: deployment.project_name, headerBackTitle: 'Back' }} />

            <ScrollView
                contentContainerClassName="p-4 gap-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Status Card */}
                <View className="bg-card border border-border rounded-xl p-4 items-center">
                    <View className="flex-row items-center gap-3 mb-2">
                        <View className={`w-4 h-4 rounded-full ${getStateColor(deployment.status)}`} />
                        <Text variant="title3" className="font-bold capitalize">{deployment.status}</Text>
                    </View>
                    <Text variant="caption1" color="tertiary" className="mb-6">
                        Updated: {new Date(deployment.updated_at).toLocaleString()}
                    </Text>

                    {/* Actions */}
                    <View className="w-full gap-3 mt-4">
                        {isRunning && (
                            <Button
                                className="w-full bg-red-500 py-4"
                                size="lg"
                                onPress={handleStop}
                                disabled={!!actionLoading}
                            >
                                {actionLoading === 'stop' ? <ActivityIndicator color="white" /> : (
                                    <View className="flex-row items-center justify-center">
                                        <MaterialCommunityIcons name="stop" size={24} color="white" className="mr-2" />
                                        <Text className="text-white font-bold text-lg">Stop</Text>
                                    </View>
                                )}
                            </Button>
                        )}

                        {isStopped && (
                            <View className="flex-row gap-3">
                                <Button
                                    className="flex-1 bg-primary py-4"
                                    size="lg"
                                    onPress={handleStart}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'start' ? <ActivityIndicator color="white" /> : (
                                        <View className="flex-row items-center justify-center">
                                            <MaterialCommunityIcons name="play" size={24} color="white" className="mr-2" />
                                            <Text className="text-white font-bold text-lg">Start</Text>
                                        </View>
                                    )}
                                </Button>
                                <Button
                                    className="flex-1 bg-red-500/10 border-red-500/20 py-4"
                                    size="lg"
                                    onPress={handleRemove}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === 'delete' ? <ActivityIndicator color="#ef4444" /> : (
                                        <View className="flex-row items-center justify-center">
                                            <MaterialCommunityIcons name="trash-can" size={24} color="#ef4444" className="mr-2" />
                                            <Text className="text-red-500 font-bold text-lg">Remove</Text>
                                        </View>
                                    )}
                                </Button>
                            </View>
                        )}

                        {isPending && (
                            <Button
                                className="w-full bg-primary py-4"
                                size="lg"
                                onPress={handleDeploy}
                                disabled={!!actionLoading}
                            >
                                {actionLoading === 'deploy' ? <ActivityIndicator color="white" /> : (
                                    <View className="flex-row items-center justify-center">
                                        <MaterialCommunityIcons name="rocket-launch" size={24} color="white" className="mr-2" />
                                        <Text className="text-white font-bold text-lg">Deploy</Text>
                                    </View>
                                )}
                            </Button>
                        )}

                        {!isRunning && (
                            <Button
                                variant="plain"
                                className="mt-2 self-center"
                                onPress={handleEdit}
                            >
                                <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} className="mr-2" />
                                <Text className="text-primary font-medium">Edit Configuration</Text>
                            </Button>
                        )}
                    </View>
                </View>

                {/* Containers */}
                <View>
                    <Text variant="heading" className="mb-3 ml-1">Containers</Text>
                    {containers.length === 0 ? (
                        <View className="bg-card border border-dashed border-border rounded-xl p-6 items-center">
                            <Text color="tertiary">No running containers</Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {containers.map(c => (
                                <Pressable
                                    key={c.id}
                                    onPress={() => router.push(`/containers/${c.id}`)}
                                    className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                                >
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="font-semibold">{c.name}</Text>
                                        <View className={`px-2 py-0.5 rounded-full border ${getContainerStateBadgeColor(c.state)}`}>
                                            <Text variant="caption2" className="capitalize">{c.state}</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row gap-4">
                                        <View className="flex-row items-center gap-1">
                                            <MaterialCommunityIcons name="server" size={14} color={colors.grey} />
                                            <Text variant="caption1" color="tertiary">{c.service_name}</Text>
                                        </View>
                                        <View className="flex-row items-center gap-1 flex-1">
                                            <MaterialCommunityIcons name="image" size={14} color={colors.grey} />
                                            <Text variant="caption1" color="tertiary" numberOfLines={1}>{c.image}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* YAML Preview */}
                <View>
                    <Text variant="heading" className="mb-3 ml-1">Configuration</Text>
                    <View className="bg-zinc-900 rounded-xl p-4">
                        <Text className="font-mono text-xs text-zinc-300 leading-5" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                            {deployment.raw_yaml}
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
