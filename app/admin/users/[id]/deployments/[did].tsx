import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface Container {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
}

export default function AdminDeploymentContainersScreen() {
    const { colors } = useColorScheme();
    const { id, did, projectName } = useLocalSearchParams<{ id: string; did: string; projectName: string }>();
    const userId = parseInt(id || '0');
    const deploymentId = parseInt(did || '0');

    const [containers, setContainers] = React.useState<Container[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchContainers = async () => {
        try {
            const data = await adminApi.getDeploymentContainers(userId, deploymentId);
            setContainers(data);
        } catch (error) {
            console.error('Failed to fetch containers:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchContainers();
        }, [userId, deploymentId])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchContainers();
    };

    const handleContainerPress = (container: Container) => {
        router.push({
            pathname: '/containers/[id]' as any,
            params: { id: container.id }
        });
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'running': return 'bg-green-500';
            case 'exited': return 'bg-red-500';
            case 'paused': return 'bg-yellow-500';
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
        <>
            <Stack.Screen options={{ headerShown: true, title: projectName || 'Containers' }} />
            <ScrollView
                className="flex-1 bg-background"
                contentContainerClassName="p-4 gap-3"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text variant="body" color="tertiary" className="mb-2">
                    {containers.length} container{containers.length !== 1 ? 's' : ''}
                </Text>

                {containers.map((container) => (
                    <Pressable
                        key={container.id}
                        onPress={() => handleContainerPress(container)}
                        className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                        <View className="flex-row items-start gap-3">
                            <View className={`w-3 h-3 rounded-full mt-1.5 ${getStateColor(container.state)}`} />
                            <View className="flex-1">
                                <Text variant="body" className="font-semibold">{container.name}</Text>
                                <Text variant="caption1" color="tertiary" className="mt-1" numberOfLines={1}>
                                    {container.image}
                                </Text>
                                <Text variant="caption2" color="tertiary" className="mt-1">
                                    {container.status}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                        </View>
                    </Pressable>
                ))}

                {containers.length === 0 && (
                    <View className="items-center py-12">
                        <MaterialCommunityIcons name="docker" size={48} color={colors.grey} />
                        <Text color="tertiary" className="mt-2">No containers</Text>
                    </View>
                )}
            </ScrollView>
        </>
    );
}
