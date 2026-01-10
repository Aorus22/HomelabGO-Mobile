import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { deploymentsApi, containersApi } from '@/services/api';
import { router, useFocusEffect } from 'expo-router';

interface Deployment {
    id: number;
    project_name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface Container {
    id: string;
    name: string;
    state: string;
    project_name: string;
    service_name: string;
}

export default function DeploymentsScreen() {
    const { colors } = useColorScheme();
    const [deployments, setDeployments] = React.useState<Deployment[]>([]);
    const [containers, setContainers] = React.useState<Container[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchData = async () => {
        try {
            const [depData, containerData] = await Promise.all([
                deploymentsApi.list(),
                containersApi.list()
            ]);
            setDeployments(depData);
            setContainers(containerData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDeploymentPress = (deployment: Deployment) => {
        router.push({
            pathname: '/deployments/[id]' as any,
            params: { id: deployment.id }
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'bg-green-500';
            case 'failed': return 'bg-red-500';
            case 'deploying': return 'bg-yellow-500';
            case 'pending': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getContainerDotColor = (state: string) => {
        switch (state) {
            case 'running': return 'bg-green-500';
            case 'exited': return 'bg-red-500';
            case 'restarting': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getProjectContainers = (projectName: string) => {
        return containers.filter(c => c.project_name === projectName);
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView
                contentContainerClassName="p-4 gap-3"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {deployments.length === 0 ? (
                    <View className="items-center py-12">
                        <MaterialCommunityIcons name="rocket-launch" size={48} color={colors.grey} />
                        <Text variant="title3" className="mt-4 mb-2">No Deployments</Text>
                        <Text color="tertiary" className="text-center">
                            Create a deployment with Docker Compose YAML
                        </Text>
                    </View>
                ) : (
                    deployments.map((deployment) => {
                        const projectContainers = getProjectContainers(deployment.project_name);

                        return (
                            <Pressable
                                key={deployment.id}
                                onPress={() => handleDeploymentPress(deployment)}
                                className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                            >
                                {/* Header */}
                                <View className="flex-row items-center gap-3">
                                    <View className={`w-3 h-3 rounded-full ${getStatusColor(deployment.status)}`} />
                                    <View className="flex-1">
                                        <Text variant="body" className="font-semibold">{deployment.project_name}</Text>
                                        <Text variant="caption1" color="tertiary">
                                            Updated: {new Date(deployment.updated_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                                </View>

                                {/* Containers row */}
                                {projectContainers.length > 0 && (
                                    <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                                        {projectContainers.map(c => (
                                            <View key={c.id} className="flex-row items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                <View className={`w-2 h-2 rounded-full ${getContainerDotColor(c.state)}`} />
                                                <Text variant="caption2" color="secondary" className="text-xs">{c.service_name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => router.push('/deployments/new')}
                className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
                style={{ elevation: 4 }}
            >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
            </Pressable>
        </View>
    );
}
