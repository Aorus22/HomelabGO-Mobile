import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface User {
    id: number;
    username: string;
    role: string;
    deployment_count: number;
    volume_count: number;
    env_file_count: number;
}

export default function AdminUsersScreen() {
    const { colors } = useColorScheme();
    const [users, setUsers] = React.useState<User[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchUsers = async () => {
        try {
            const data = await adminApi.listUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchUsers();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleUserPress = (user: User) => {
        router.push({
            pathname: '/admin/users/[id]' as any,
            params: { id: user.id, username: user.username }
        });
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
            <Text variant="title2" className="font-bold mb-2">Users ({users.length})</Text>

            {users.map((user) => (
                <Pressable
                    key={user.id}
                    onPress={() => handleUserPress(user)}
                    className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                >
                    <View className="flex-row items-center gap-3">
                        <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center">
                            <MaterialCommunityIcons name="account" size={24} color={colors.primary} />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                                <Text variant="body" className="font-semibold">{user.username}</Text>
                                {user.role === 'admin' && (
                                    <View className="bg-primary/20 px-2 py-0.5 rounded">
                                        <Text variant="caption2" className="text-primary font-bold">ADMIN</Text>
                                    </View>
                                )}
                            </View>
                            <View className="flex-row gap-4 mt-1">
                                <Text variant="caption1" color="tertiary">
                                    {user.deployment_count} deployments
                                </Text>
                                <Text variant="caption1" color="tertiary">
                                    {user.volume_count} volumes
                                </Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                    </View>
                </Pressable>
            ))}

            {users.length === 0 && (
                <View className="items-center py-12">
                    <MaterialCommunityIcons name="account-off" size={48} color={colors.grey} />
                    <Text color="tertiary" className="mt-2">No users found</Text>
                </View>
            )}
        </ScrollView>
    );
}
