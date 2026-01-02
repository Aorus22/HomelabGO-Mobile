import * as React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Text } from '@/components/nativewindui/Text';
import { ProgressIndicator } from '@/components/nativewindui/ProgressIndicator';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useAuth } from '@/context/auth';
import { systemApi, containersApi } from '@/services/api';

interface Stats {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
    host_info: {
        hostname: string;
        platform: string;
        uptime: number;
    };
}

export default function DashboardScreen() {
    const { user, logout } = useAuth();
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [containerCount, setContainerCount] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchData = async () => {
        try {
            const [statsData, containers] = await Promise.all([
                systemApi.getStats(),
                containersApi.list().catch(() => []),
            ]);
            setStats(statsData as Stats);
            setContainerCount(containers.length);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
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
            contentContainerClassName="p-4 gap-4"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Welcome Card */}
            <View className="bg-card border border-border rounded-xl p-4">
                <Text variant="title3" className="font-semibold mb-1">
                    Selamat datang, {user?.username || 'User'}!
                </Text>
                <Text color="tertiary" variant="subhead">
                    Kelola homelab Anda dengan mudah
                </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap gap-4">
                {/* CPU */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-2">CPU Usage</Text>
                    <Text variant="title2" className="font-bold mb-3">
                        {stats?.cpu_percent.toFixed(1)}%
                    </Text>
                    <ProgressIndicator value={stats?.cpu_percent || 0} />
                </View>

                {/* Memory */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-2">Memory</Text>
                    <Text variant="title2" className="font-bold mb-3">
                        {stats?.memory_percent.toFixed(1)}%
                    </Text>
                    <ProgressIndicator value={stats?.memory_percent || 0} />
                </View>

                {/* Disk */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-2">Disk</Text>
                    <Text variant="title2" className="font-bold mb-3">
                        {stats?.disk_percent.toFixed(1)}%
                    </Text>
                    <ProgressIndicator value={stats?.disk_percent || 0} />
                </View>
            </View>

            {/* Info Cards */}
            <View className="flex-row flex-wrap gap-4">
                {/* Host Info */}
                <View className="flex-1 min-w-[200px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-3">Host Info</Text>
                    <View className="gap-2">
                        <View className="flex-row justify-between">
                            <Text color="secondary">Hostname</Text>
                            <Text className="font-medium">{stats?.host_info.hostname || '-'}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text color="secondary">Platform</Text>
                            <Text className="font-medium">{stats?.host_info.platform || '-'}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text color="secondary">Uptime</Text>
                            <Text className="font-medium">
                                {stats?.host_info.uptime ? formatUptime(stats.host_info.uptime) : '-'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Containers */}
                <View className="flex-1 min-w-[200px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-3">Containers</Text>
                    <Text variant="largeTitle" className="font-bold text-primary">
                        {containerCount}
                    </Text>
                    <Text color="tertiary" variant="caption1">Running containers</Text>
                </View>
            </View>

            {/* Network Info */}
            <View className="bg-card border border-border rounded-xl p-4">
                <Text variant="footnote" color="tertiary" className="mb-2">User Network</Text>
                <View className="flex-row items-center gap-2">
                    <View className="w-3 h-3 rounded-full bg-green-500" />
                    <Text className="font-mono">net_user_{user?.id || '?'}</Text>
                </View>
            </View>

            {/* Logout Button */}
            <Button variant="secondary" onPress={handleLogout} className="mt-4">
                <Text>Logout</Text>
            </Button>
        </ScrollView>
    );
}
