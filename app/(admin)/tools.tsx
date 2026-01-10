import * as React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';

interface Tool {
    id: string;
    name: string;
    description: string;
    icon: any;
    color: string;
    route: string;
}

export default function AdminToolsScreen() {
    const { colors } = useColorScheme();

    const tools: Tool[] = [
        {
            id: 'speedtest',
            name: 'Speedtest',
            description: 'Test internet connection speed',
            icon: 'speedometer',
            color: '#3b82f6',
            route: '/admin/tools/speedtest',
        },
        {
            id: 'terminal',
            name: 'Host Terminal',
            description: 'Access backend host terminal',
            icon: 'console',
            color: '#10b981',
            route: '/admin/tools/terminal',
        },
        {
            id: 'files',
            name: 'File Manager',
            description: 'Browse host filesystem',
            icon: 'folder',
            color: '#f59e0b',
            route: '/admin/tools/files',
        },
        {
            id: 'cron',
            name: 'Cron Manager',
            description: 'Edit scheduled tasks (crontab)',
            icon: 'clock-outline',
            color: '#ef4444',
            route: '/admin/tools/cron-manager',
        },
        {
            id: 'services',
            name: 'System Services',
            description: 'Manage systemd services',
            icon: 'cogs',
            color: '#6366f1',
            route: '/admin/tools/services',
        },
        {
            id: 'ports',
            name: 'Port Manager',
            description: 'View open ports and processes',
            icon: 'lan-connect',
            color: '#a855f7',
            route: '/admin/tools/ports',
        },
        {
            id: 'network-interfaces',
            name: 'Network Interfaces',
            description: 'View IP addresses and status',
            icon: 'access-point-network',
            color: '#14b8a6',
            route: '/admin/tools/network-interfaces',
        },
    ];

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="p-4 gap-4"
        >
            <Text variant="title2" className="font-bold mb-2">Admin Tools</Text>

            <View className="gap-3">
                {tools.map((tool) => (
                    <Pressable
                        key={tool.id}
                        onPress={() => router.push(tool.route as any)}
                        className="bg-card border border-border rounded-xl p-4 flex-row items-center gap-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                        <View
                            className="w-14 h-14 rounded-xl items-center justify-center"
                            style={{ backgroundColor: tool.color + '20' }}
                        >
                            <MaterialCommunityIcons name={tool.icon} size={28} color={tool.color} />
                        </View>
                        <View className="flex-1">
                            <Text variant="body" className="font-semibold">{tool.name}</Text>
                            <Text variant="caption1" color="tertiary" className="mt-1">
                                {tool.description}
                            </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                    </Pressable>
                ))}
            </View>
        </ScrollView>
    );
}
