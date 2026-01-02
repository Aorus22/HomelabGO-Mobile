import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { deploymentsApi } from '@/services/api';
import { router, useFocusEffect } from 'expo-router';

interface Deployment {
    id: number;
    project_name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export default function DeploymentsScreen() {
    const { colors } = useColorScheme();
    const [deployments, setDeployments] = React.useState<Deployment[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [deployingId, setDeployingId] = React.useState<number | null>(null);

    const fetchDeployments = async () => {
        try {
            const data = await deploymentsApi.list();
            setDeployments(data);
        } catch (error) {
            console.error('Failed to fetch deployments:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchDeployments();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchDeployments();
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
                    deployments.map((deployment) => (
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
                        </Pressable>
                    ))
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
