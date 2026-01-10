import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { adminApi } from '@/services/api';
import { ManagedBadge } from '@/components/ManagedBadge';

export default function DockerVolumesScreen() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [data, setData] = React.useState<any[]>([]);

    const fetchData = async () => {
        try {
            const res = await adminApi.listDockerVolumes();
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
                keyExtractor={(item) => item.name}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View className="p-8 items-center">
                        <Text color="tertiary">No volumes found</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="bg-card border border-border rounded-xl p-4 mb-3">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                                <Text className="font-bold text-lg" numberOfLines={1}>{item.name}</Text>
                                <Text variant="caption1" color="tertiary">Driver: {item.driver}</Text>
                            </View>
                            <ManagedBadge isManaged={item.is_managed} />
                        </View>
                        <Text variant="caption2" color="secondary" numberOfLines={1}>{item.mountpoint}</Text>
                    </View>
                )}
            />
        </View>
    );
}
