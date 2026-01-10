import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface Deployment {
    id: number;
    project_name: string;
    status: string;
    container_count: number;
    created_at: string;
}

interface Volume {
    id: number;
    name: string;
    volume_name: string;
    created_at: string;
}

interface EnvFile {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

export default function AdminUserDetailScreen() {
    const { colors } = useColorScheme();
    const { id, username } = useLocalSearchParams<{ id: string; username: string }>();
    const userId = parseInt(id || '0');

    const [deployments, setDeployments] = React.useState<Deployment[]>([]);
    const [volumes, setVolumes] = React.useState<Volume[]>([]);
    const [envFiles, setEnvFiles] = React.useState<EnvFile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'deployments' | 'volumes' | 'envfiles'>('deployments');

    const fetchData = async () => {
        try {
            const [deploymentsData, volumesData, envFilesData] = await Promise.all([
                adminApi.getUserDeployments(userId),
                adminApi.getUserVolumes(userId),
                adminApi.getUserEnvFiles(userId),
            ]);
            setDeployments(deploymentsData);
            setVolumes(volumesData);
            setEnvFiles(envFilesData);
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [userId])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleDeploymentPress = (deployment: Deployment) => {
        router.push({
            pathname: '/admin/users/[id]/deployments/[did]' as any,
            params: { id: userId, did: deployment.id, projectName: deployment.project_name }
        });
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
        <>
            <Stack.Screen options={{ headerShown: true, title: username || 'User' }} />
            <View className="flex-1 bg-background">
                {/* Tab Bar */}
                <View className="flex-row border-b border-border">
                    {(['deployments', 'volumes', 'envfiles'] as const).map((tab) => (
                        <Pressable
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`flex-1 py-3 ${activeTab === tab ? 'border-b-2 border-primary' : ''}`}
                        >
                            <Text
                                className={`text-center ${activeTab === tab ? 'text-primary font-semibold' : ''}`}
                                color={activeTab === tab ? undefined : 'tertiary'}
                            >
                                {tab === 'deployments' ? `Deployments (${deployments.length})` :
                                    tab === 'volumes' ? `Volumes (${volumes.length})` :
                                        `Env Files (${envFiles.length})`}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <ScrollView
                    contentContainerClassName="p-4 gap-3"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {activeTab === 'deployments' && (
                        <>
                            {deployments.map((deployment) => (
                                <Pressable
                                    key={deployment.id}
                                    onPress={() => handleDeploymentPress(deployment)}
                                    className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View className={`w-3 h-3 rounded-full ${getStatusColor(deployment.status)}`} />
                                        <View className="flex-1">
                                            <Text variant="body" className="font-semibold">
                                                {deployment.project_name}
                                            </Text>
                                            <Text variant="caption1" color="tertiary">
                                                {deployment.container_count} containers
                                            </Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                                    </View>
                                </Pressable>
                            ))}
                            {deployments.length === 0 && (
                                <View className="items-center py-12">
                                    <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.grey} />
                                    <Text color="tertiary" className="mt-2">No deployments</Text>
                                </View>
                            )}
                        </>
                    )}

                    {activeTab === 'volumes' && (
                        <>
                            {volumes.map((volume) => (
                                <View
                                    key={volume.id}
                                    className="bg-card border border-border rounded-xl p-4"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <MaterialCommunityIcons name="database" size={24} color={colors.primary} />
                                        <View className="flex-1">
                                            <Text variant="body" className="font-semibold">
                                                {volume.name}
                                            </Text>
                                            <Text variant="caption1" color="tertiary">
                                                {volume.volume_name}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                            {volumes.length === 0 && (
                                <View className="items-center py-12">
                                    <MaterialCommunityIcons name="database-off" size={48} color={colors.grey} />
                                    <Text color="tertiary" className="mt-2">No volumes</Text>
                                </View>
                            )}
                        </>
                    )}

                    {activeTab === 'envfiles' && (
                        <>
                            {envFiles.map((envFile) => (
                                <View
                                    key={envFile.id}
                                    className="bg-card border border-border rounded-xl p-4"
                                >
                                    <View className="flex-row items-center gap-3">
                                        <MaterialCommunityIcons name="file-code" size={24} color={colors.primary} />
                                        <View className="flex-1">
                                            <Text variant="body" className="font-semibold">
                                                {envFile.name}
                                            </Text>
                                            <Text variant="caption2" color="tertiary">
                                                Content hidden for security
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                            {envFiles.length === 0 && (
                                <View className="items-center py-12">
                                    <MaterialCommunityIcons name="file-hidden" size={48} color={colors.grey} />
                                    <Text color="tertiary" className="mt-2">No env files</Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>
        </>
    );
}
