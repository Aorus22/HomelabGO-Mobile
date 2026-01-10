import React from 'react';
import { View, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { adminApi } from '@/services/api';
import { ManagedBadge } from '@/components/ManagedBadge';

export default function DockerContainersScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [data, setData] = React.useState<any[]>([]);

    const fetchData = async () => {
        try {
            const res = await adminApi.listDockerContainers();
            setData(res);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <FlatList
                contentContainerClassName="p-4"
                data={data}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View className="p-8 items-center">
                        <Text color="tertiary">No containers found</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => router.push(`/containers/${item.id}`)}
                        className="bg-card border border-border rounded-xl p-4 mb-3 active:opacity-70"
                    >
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                                <Text className="font-bold text-lg" numberOfLines={1}>{item.name}</Text>
                                <Text variant="caption1" color="tertiary" numberOfLines={1}>{item.image}</Text>
                            </View>
                            <ManagedBadge isManaged={item.is_managed} />
                        </View>
                        <View className="flex-row gap-4">
                            <View className="bg-muted px-2 py-1 rounded">
                                <Text className="text-xs font-mono">{item.state}</Text>
                            </View>
                            {item.project_name && (
                                <View className="bg-primary/10 px-2 py-1 rounded">
                                    <Text className="text-xs text-primary">{item.project_name}</Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                )}
            />
        </View>
    );
}
