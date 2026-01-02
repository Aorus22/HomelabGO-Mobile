import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { containersApi } from '@/services/api';
import { router } from 'expo-router';

interface Container {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    project_name: string;
    service_name: string;
}

export default function ContainersScreen() {
    const { colors } = useColorScheme();
    const [containers, setContainers] = React.useState<Container[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    const fetchContainers = async () => {
        try {
            const data = await containersApi.list();
            setContainers(data);
        } catch (error) {
            console.error('Failed to fetch containers:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchContainers();
    }, []);

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
            case 'restarting': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const getStateBadgeColor = (state: string) => {
        switch (state) {
            case 'running': return 'bg-green-500/10 border-green-500/20';
            case 'exited': return 'bg-red-500/10 border-red-500/20';
            case 'restarting': return 'bg-yellow-500/10 border-yellow-500/20';
            default: return 'bg-gray-500/10 border-gray-500/20';
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
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="p-4 gap-3"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {containers.length === 0 ? (
                <View className="items-center py-12">
                    <MaterialCommunityIcons name="docker" size={48} color={colors.grey} />
                    <Text variant="title3" className="mt-4 mb-2">No Containers</Text>
                    <Text color="tertiary" className="text-center">
                        Deploy a project to see containers here
                    </Text>
                </View>
            ) : (
                containers.map((container) => (
                    <Pressable
                        key={container.id}
                        onPress={() => handleContainerPress(container)}
                        className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                        {/* Header */}
                        <View className="flex-row items-center gap-3 mb-3">
                            <View className={`w-3 h-3 rounded-full ${getStateColor(container.state)}`} />
                            <View className="flex-1">
                                <Text variant="body" className="font-semibold">{container.name}</Text>
                                <Text variant="caption1" color="tertiary">{container.image}</Text>
                            </View>
                            <View className={`px-2 py-1 rounded-full border ${getStateBadgeColor(container.state)}`}>
                                <Text variant="caption2" className="capitalize">{container.state}</Text>
                            </View>
                        </View>

                        {/* Info */}
                        <View className="flex-row gap-4">
                            <View className="flex-row items-center gap-1">
                                <MaterialCommunityIcons name="folder" size={14} color={colors.grey} />
                                <Text variant="caption1" color="tertiary">{container.project_name || '-'}</Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <MaterialCommunityIcons name="server" size={14} color={colors.grey} />
                                <Text variant="caption1" color="tertiary">{container.service_name || '-'}</Text>
                            </View>
                        </View>
                    </Pressable>
                ))
            )}
        </ScrollView>
    );
}
