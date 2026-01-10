import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface CloudflareInstance {
    id: number;
    token: string;
    container_id: string;
    status: string;
}

export default function AdminSettingsScreen() {
    const { colors } = useColorScheme();
    const [instances, setInstances] = React.useState<CloudflareInstance[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);
    const [newToken, setNewToken] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState<number | null>(null);

    const fetchInstances = async () => {
        try {
            const data = await adminApi.listCloudflareInstances();
            setInstances(data);
        } catch (error) {
            console.error('Failed to fetch instances:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchInstances();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchInstances();
    };

    const createInstance = async () => {
        if (!newToken.trim()) {
            Alert.alert('Error', 'Token is required');
            return;
        }
        setIsCreating(true);
        try {
            await adminApi.createCloudflareInstance(newToken.trim());
            setShowModal(false);
            setNewToken('');
            fetchInstances();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create instance');
        } finally {
            setIsCreating(false);
        }
    };

    const startInstance = async (id: number) => {
        setActionLoading(id);
        try {
            await adminApi.startCloudflareInstance(id);
            fetchInstances();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start');
        } finally {
            setActionLoading(null);
        }
    };

    const stopInstance = async (id: number) => {
        setActionLoading(id);
        try {
            await adminApi.stopCloudflareInstance(id);
            fetchInstances();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to stop');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteInstance = async (id: number) => {
        Alert.alert('Delete Instance', 'Are you sure you want to delete this Cloudflare instance?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(id);
                    try {
                        await adminApi.deleteCloudflareInstance(id);
                        fetchInstances();
                    } catch (error) {
                        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete');
                    } finally {
                        setActionLoading(null);
                    }
                },
            },
        ]);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'bg-green-500';
            case 'stopped': return 'bg-red-500';
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
                contentContainerClassName="p-4 gap-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <Text variant="title2" className="font-bold">Admin Settings</Text>

                {/* Cloudflare Section */}
                <View className="bg-card border border-border rounded-xl p-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <View>
                            <Text variant="body" className="font-semibold">Cloudflare Tunnels</Text>
                            <Text variant="caption1" color="tertiary">
                                Admin tunnels use --network host
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => setShowModal(true)}
                            className="bg-primary/20 px-3 py-2 rounded-lg flex-row items-center gap-1"
                        >
                            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                            <Text className="text-primary font-medium">Add</Text>
                        </Pressable>
                    </View>

                    {instances.length === 0 ? (
                        <View className="items-center py-8">
                            <MaterialCommunityIcons name="cloud-off-outline" size={48} color={colors.grey} />
                            <Text color="tertiary" className="mt-2">No Cloudflare instances</Text>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {instances.map((instance) => (
                                <View
                                    key={instance.id}
                                    className="bg-background border border-border rounded-lg p-3"
                                >
                                    <View className="flex-row items-center gap-3 mb-3">
                                        <View className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`} />
                                        <View className="flex-1">
                                            <Text variant="body" className="font-medium">
                                                Instance #{instance.id}
                                            </Text>
                                            <Text variant="caption2" color="tertiary">
                                                Token: {instance.token}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="flex-row gap-2">
                                        {instance.status === 'running' ? (
                                            <Button
                                                variant="secondary"
                                                onPress={() => stopInstance(instance.id)}
                                                disabled={actionLoading === instance.id}
                                                className="flex-1"
                                            >
                                                {actionLoading === instance.id ? (
                                                    <ActivityIndicator size="small" />
                                                ) : (
                                                    <Text>Stop</Text>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                onPress={() => startInstance(instance.id)}
                                                disabled={actionLoading === instance.id}
                                                className="flex-1"
                                            >
                                                {actionLoading === instance.id ? (
                                                    <ActivityIndicator size="small" />
                                                ) : (
                                                    <Text className="text-white">Start</Text>
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            variant="tonal"
                                            onPress={() => deleteInstance(instance.id)}
                                            disabled={actionLoading === instance.id}
                                        >
                                            <MaterialCommunityIcons name="delete" size={18} color="#ef4444" />
                                        </Button>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Add Instance Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowModal(false)}
            >
                <View className="flex-1 bg-background p-4">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text variant="title3" className="font-bold">Add Cloudflare Instance</Text>
                        <Pressable onPress={() => setShowModal(false)}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.grey} />
                        </Pressable>
                    </View>

                    <Text variant="footnote" className="mb-2 text-muted-foreground">Tunnel Token</Text>
                    <TextInput
                        value={newToken}
                        onChangeText={setNewToken}
                        placeholder="Enter your Cloudflare tunnel token"
                        placeholderTextColor={colors.grey}
                        multiline
                        className="bg-card border border-border rounded-xl px-4 py-3 text-foreground min-h-[100px]"
                        style={{ color: colors.foreground }}
                    />

                    <Text variant="caption2" color="tertiary" className="mt-2 mb-6">
                        Admin tunnels always use --network host for full access
                    </Text>

                    <View className="flex-row gap-3">
                        <Button
                            variant="secondary"
                            onPress={() => setShowModal(false)}
                            className="flex-1"
                        >
                            <Text>Cancel</Text>
                        </Button>
                        <Button
                            variant="primary"
                            onPress={createInstance}
                            disabled={isCreating || !newToken.trim()}
                            className="flex-1"
                        >
                            {isCreating ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-white">Create</Text>
                            )}
                        </Button>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
