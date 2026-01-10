import React from 'react';
import { View, FlatList, RefreshControl, Alert, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface ProcessItem {
    pid: string;
    user: string;
    cpu: string;
    memory: string;
    command: string;
}

export default function ProcessesScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [processes, setProcesses] = React.useState<ProcessItem[]>([]);
    const [isKilling, setIsKilling] = React.useState<string | null>(null);

    const fetchData = async () => {
        try {
            const res = await adminApi.listProcesses();
            setProcesses(res || []);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load processes');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleKill = (pid: string, name: string) => {
        Alert.alert(
            'Kill Process',
            `Are you sure you want to kill process "${name}" (PID: ${pid})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Kill',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsKilling(pid);
                            await adminApi.killProcess(pid);
                            setProcesses(prev => prev.filter(p => p.pid !== pid));
                            Alert.alert('Success', 'Process killed');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to kill process');
                        } finally {
                            setIsKilling(null);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ProcessItem }) => (
        <View className="bg-card border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
                <Text className="font-bold text-lg" numberOfLines={1}>{item.command}</Text>
                <View className="flex-row items-center gap-3 mt-1">
                    <Text className="text-muted-foreground text-xs font-mono">PID: {item.pid}</Text>
                    <Text className="text-muted-foreground text-xs">User: {item.user}</Text>
                </View>
            </View>

            <View className="items-end gap-1">
                <View className="flex-row gap-2">
                    <View className="items-end">
                        <Text className="font-bold text-xs">CPU</Text>
                        <Text className="text-primary font-mono">{item.cpu}%</Text>
                    </View>
                    <View className="items-end">
                        <Text className="font-bold text-xs">MEM</Text>
                        <Text className="text-secondary font-mono">{item.memory}%</Text>
                    </View>
                </View>

                <Pressable
                    onPress={() => handleKill(item.pid, item.command)}
                    className="bg-destructive/10 px-3 py-1.5 rounded-lg mt-2 active:bg-destructive/20"
                    disabled={isKilling === item.pid}
                >
                    {isKilling === item.pid ? (
                        <ActivityIndicator size="small" color={colors.destructive} />
                    ) : (
                        <Text className="text-destructive font-bold text-xs">KILL</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: 'Process Manager' }} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    contentContainerClassName="p-4"
                    data={processes}
                    keyExtractor={(item) => item.pid}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text color="tertiary">No processes found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
