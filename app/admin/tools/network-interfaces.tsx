import React from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface NetworkItem {
    name: string;
    mac: string;
    ips: string[];
    flags: string;
    mtu: number;
}

export default function NetworkInterfacesScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [networks, setNetworks] = React.useState<NetworkItem[]>([]);

    const fetchData = async () => {
        try {
            const res = await adminApi.listNetworks();
            setNetworks(res || []);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load networks');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const renderItem = ({ item }: { item: NetworkItem }) => {
        const isUp = item.flags.includes('up');
        return (
            <View className="bg-card border border-border rounded-xl p-4 mb-3">
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center gap-2">
                        <MaterialCommunityIcons
                            name="ethernet"
                            size={20}
                            color={isUp ? colors.primary : colors.grey}
                        />
                        <Text className="font-bold text-lg">{item.name}</Text>
                    </View>
                    <View className={`px-2 py-0.5 rounded-full ${isUp ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <Text className={`text-xs font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                            {isUp ? 'UP' : 'DOWN'}
                        </Text>
                    </View>
                </View>

                <View className="gap-1 mt-2">
                    {(item.ips || []).map((ip, idx) => (
                        <Text key={idx} className="font-mono text-sm">{ip}</Text>
                    ))}
                    {(!item.ips || item.ips.length === 0) && <Text className="text-muted-foreground text-sm italic">No IP Address</Text>}
                </View>

                <View className="flex-row justify-between mt-3 pt-3 border-t border-border">
                    <Text className="text-xs text-muted-foreground">MAC: <Text className="font-mono">{item.mac}</Text></Text>
                    <Text className="text-xs text-muted-foreground">MTU: {item.mtu}</Text>
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: 'Network Interfaces' }} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    contentContainerClassName="p-4"
                    data={networks}
                    keyExtractor={(item) => item.name}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text color="tertiary">No interfaces found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
