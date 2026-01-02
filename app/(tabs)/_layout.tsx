import * as React from 'react';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useColorScheme } from '@/lib/useColorScheme';

export default function TabsLayout() {
    const { colors, isDarkColorScheme } = useColorScheme();
    const { width } = useWindowDimensions();

    // Web sidebar for wider screens
    const isWideScreen = Platform.OS === 'web' && width >= 768;

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.grey,
                tabBarStyle: {
                    backgroundColor: isDarkColorScheme ? '#000' : '#fff',
                    borderTopColor: colors.grey2,
                    // Hide bottom tabs on wide screens (will use sidebar)
                    display: isWideScreen ? 'none' : 'flex',
                },
                headerStyle: {
                    backgroundColor: isDarkColorScheme ? '#000' : '#fff',
                },
                headerTintColor: colors.foreground,
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="deployments"
                options={{
                    title: 'Deployments',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="rocket-launch" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="containers"
                options={{
                    title: 'Containers',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="docker" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="volumes"
                options={{
                    title: 'Volumes',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="harddisk" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="cog" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
