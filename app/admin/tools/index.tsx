import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';

export default function ToolsMenuScreen() {
    const router = useRouter();
    const { colors } = useColorScheme();
    console.log('[Tools] Rendering menu items');

    const tools = [
        {
            id: 'ports',
            name: 'Port Manager',
            description: 'View open ports and processes',
            icon: 'lan-connect',
            color: '#a855f7', // purple-500
            route: '/admin/tools/ports'
        },
        {
            id: 'network-interfaces',
            name: 'Network Interfaces',
            description: 'View IP addresses and status',
            icon: 'access-point-network',
            color: '#14b8a6', // teal-500
            route: '/admin/tools/network-interfaces'
        },
        {
            id: 'speedtest',
            name: 'Speedtest',
            description: 'Check server network speed and latency',
            icon: 'speedometer',
            color: '#3b82f6', // blue-500
            route: '/admin/tools/speedtest'
        },
        {
            id: 'terminal',
            name: 'Host Terminal',
            description: 'Access server shell directly',
            icon: 'console',
            color: '#22c55e', // green-500
            route: '/admin/tools/terminal'
        },
        {
            id: 'files',
            name: 'File Manager',
            description: 'Browse and manage host files',
            icon: 'folder-multiple',
            color: '#f59e0b', // amber-500
            route: '/admin/tools/files'
        },
        {
            id: 'cron',
            name: 'Cron Manager',
            description: 'Edit scheduled tasks (crontab)',
            icon: 'clock-outline',
            color: '#ef4444', // red-500
            route: '/admin/tools/cron-manager'
        },
        {
            id: 'services',
            name: 'System Services',
            description: 'Manage systemd services',
            icon: 'cogs',
            color: '#6366f1', // indigo-500
            route: '/admin/tools/services'
        }
    ];

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
            <Stack.Screen options={{ title: 'Tools' }} />

            {tools.map((tool) => (
                <Pressable
                    key={tool.id}
                    onPress={() => router.push(tool.route as any)}
                    className="bg-card border border-border rounded-xl p-4 flex-row items-center gap-4 active:opacity-70"
                >
                    <View
                        className="w-12 h-12 rounded-full items-center justify-center bg-opacity-10"
                        style={{ backgroundColor: `${tool.color}20` }}
                    >
                        <MaterialCommunityIcons name={tool.icon as any} size={24} color={tool.color} />
                    </View>
                    <View className="flex-1">
                        <Text className="font-semibold text-lg">{tool.name}</Text>
                        <Text variant="caption1" color="tertiary">
                            {tool.description}
                        </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.grey} />
                </Pressable>
            ))}
        </ScrollView>
    );
}
