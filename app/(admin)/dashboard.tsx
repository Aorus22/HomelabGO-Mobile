import * as React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Text } from '@/components/nativewindui/Text';
import { ProgressIndicator } from '@/components/nativewindui/ProgressIndicator';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useAuth } from '@/context/auth';
import { systemApi, adminApi } from '@/services/api';

interface Stats {
    cpu_percent: number;
    memory_percent: number;
    memory_used: number;
    memory_total: number;
    disk_percent: number;
    disk_used: number;
    disk_total: number;
    host_info: {
        hostname: string;
        platform: string;
        uptime: number;
    };
}

interface AdminStats {
    total_users: number;
    total_containers: number;
}

export default function AdminDashboardScreen() {
    const { user, logout } = useAuth();
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [adminStats, setAdminStats] = React.useState<AdminStats>({ total_users: 0, total_containers: 0 });
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchData = async () => {
        try {
            const [statsData, users, containers] = await Promise.all([
                systemApi.getStats(),
                adminApi.listUsers().catch(() => []),
                adminApi.listAllContainers().catch(() => []),
            ]);
            setStats(statsData as Stats);
            setAdminStats({
                total_users: users.length,
                total_containers: containers.length,
            });
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

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
            {/* Admin Welcome Card */}
            <View className="bg-primary/10 border border-primary/30 rounded-xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                    <View className="w-3 h-3 rounded-full bg-primary" />
                    <Text variant="caption1" className="text-primary font-bold">ADMIN PANEL</Text>
                </View>
                <Text variant="title3" className="font-semibold">
                    Welcome, {user?.username || 'Admin'}!
                </Text>
                <Text color="tertiary" variant="subhead">
                    Full system management access
                </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap gap-4">
                {/* CPU */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-1">CPU Usage</Text>
                    <Text variant="title2" className="font-bold">
                        {stats?.cpu_percent.toFixed(1)}%
                    </Text>
                    <ProgressIndicator value={stats?.cpu_percent || 0} className="mt-2" />
                </View>

                {/* Memory */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-1">Memory</Text>
                    <Text variant="title2" className="font-bold">
                        {stats?.memory_percent.toFixed(1)}%
                    </Text>
                    <Text variant="caption2" color="tertiary">
                        {formatBytes(stats?.memory_used || 0)} / {formatBytes(stats?.memory_total || 0)}
                    </Text>
                    <ProgressIndicator value={stats?.memory_percent || 0} className="mt-2" />
                </View>

                {/* Disk */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-1">Disk</Text>
                    <Text variant="title2" className="font-bold">
                        {stats?.disk_percent.toFixed(1)}%
                    </Text>
                    <Text variant="caption2" color="tertiary">
                        {formatBytes(stats?.disk_used || 0)} / {formatBytes(stats?.disk_total || 0)}
                    </Text>
                    <ProgressIndicator value={stats?.disk_percent || 0} className="mt-2" />
                </View>
            </View>

            {/* Admin Stats */}
            <View className="flex-row flex-wrap gap-4">
                {/* Total Users */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-3">Total Users</Text>
                    <Text variant="largeTitle" className="font-bold text-blue-500">
                        {adminStats.total_users}
                    </Text>
                    <Text color="tertiary" variant="caption1">Registered accounts</Text>
                </View>

                {/* Total Containers */}
                <View className="flex-1 min-w-[140px] bg-card border border-border rounded-xl p-4">
                    <Text variant="footnote" color="tertiary" className="mb-3">Total Containers</Text>
                    <Text variant="largeTitle" className="font-bold text-green-500">
                        {adminStats.total_containers}
                    </Text>
                    <Text color="tertiary" variant="caption1">Managed containers</Text>
                </View>
            </View>

            {/* Host Info */}
            <View className="bg-card border border-border rounded-xl p-4">
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

            {/* Logout Button */}
            <Button variant="secondary" onPress={handleLogout} className="mt-4">
                <Text>Logout</Text>
            </Button>
        </ScrollView>
    );
}
