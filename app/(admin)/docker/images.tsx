import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { adminApi } from '@/services/api';
import { ManagedBadge } from '@/components/ManagedBadge';

export default function DockerImagesScreen() {
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [data, setData] = React.useState<any[]>([]);

    const fetchData = async () => {
        try {
            const res = await adminApi.listDockerImages();
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

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
                        <Text color="tertiary">No images found</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="bg-card border border-border rounded-xl p-4 mb-3">
                        <View className="flex-row justify-between items-start mb-2">
                            <View className="flex-1">
                                {item.tags && item.tags.length > 0 ? (
                                    item.tags.map((tag: string) => (
                                        <Text key={tag} className="font-bold text-base" numberOfLines={1}>{tag}</Text>
                                    ))
                                ) : (
                                    <Text className="font-bold text-base text-muted-foreground">&lt;none&gt;:&lt;none&gt;</Text>
                                )}
                                <Text variant="caption1" color="tertiary" className="font-mono">{item.id}</Text>
                            </View>
                            <ManagedBadge isManaged={item.is_managed} />
                        </View>
                        <Text variant="caption1" className="mt-1">{formatBytes(item.size)}</Text>
                    </View>
                )}
            />
        </View>
    );
}
