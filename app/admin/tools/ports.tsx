import React from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface PortItem {
    protocol: string;
    port: string;
    address: string;
    process: string;
    pid: string;
}

export default function PortsScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [ports, setPorts] = React.useState<PortItem[]>([]);

    const fetchData = async () => {
        try {
            const res = await adminApi.listPorts();
            const sorted = (res || []).sort((a, b) => parseInt(a.port) - parseInt(b.port));
            setPorts(sorted);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load ports');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const renderItem = ({ item }: { item: PortItem }) => (
        <View className="bg-card border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between">
            <View>
                <View className="flex-row items-center gap-2 mb-1">
                    <View className="bg-primary/20 px-2 py-0.5 rounded">
                        <Text className="text-primary font-bold text-xs">{item.protocol}</Text>
                    </View>
                    <Text className="font-bold text-lg">{item.port}</Text>
                </View>
                <Text className="text-muted-foreground text-xs font-mono">{item.address}</Text>
            </View>
            <View className="items-end">
                <Text className="font-bold">{item.process}</Text>
                <Text className="text-muted-foreground text-xs">PID: {item.pid}</Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: 'Port Manager' }} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    contentContainerClassName="p-4"
                    data={ports}
                    keyExtractor={(item, index) => `${item.address}-${item.port}-${item.protocol}-${index}`}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text color="tertiary">No open ports found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
