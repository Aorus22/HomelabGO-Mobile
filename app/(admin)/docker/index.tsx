import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';

export default function DockerMenuScreen() {
    const router = useRouter();
    const { colors } = useColorScheme();

    const items = [
        {
            id: 'containers',
            name: 'Containers',
            description: 'Manage system containers',
            icon: 'cube-outline',
            color: '#3b82f6', // blue-500
            route: '/docker/containers'
        },
        {
            id: 'images',
            name: 'Images',
            description: 'Docker images and sizes',
            icon: 'layers-outline',
            color: '#8b5cf6', // violet-500
            route: '/docker/images'
        },
        {
            id: 'networks',
            name: 'Networks',
            description: 'Network configurations',
            icon: 'access-point-network',
            color: '#f59e0b', // amber-500
            route: '/docker/networks'
        },
        {
            id: 'volumes',
            name: 'Volumes',
            description: 'Storage volumes',
            icon: 'database-outline',
            color: '#10b981', // emerald-500
            route: '/docker/volumes'
        }
    ];

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 gap-4">
            {items.map((item) => (
                <Pressable
                    key={item.id}
                    onPress={() => router.push(item.route as any)}
                    className="bg-card border border-border rounded-xl p-4 flex-row items-center gap-4 active:opacity-70"
                >
                    <View
                        className="w-12 h-12 rounded-full items-center justify-center bg-opacity-10"
                        style={{ backgroundColor: `${item.color}20` }}
                    >
                        <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                    </View>
                    <View className="flex-1">
                        <Text className="font-semibold text-lg">{item.name}</Text>
                        <Text variant="caption1" color="tertiary">
                            {item.description}
                        </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color={colors.grey} />
                </Pressable>
            ))}
        </ScrollView>
    );
}
