import * as React from 'react';
import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useColorScheme } from '@/lib/useColorScheme';

export default function AdminTabLayout() {
    const { colors, isDarkColorScheme } = useColorScheme();
    const { width } = useWindowDimensions();

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
                name="users"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-group" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="docker"
                options={{
                    title: 'Docker',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="docker" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="tools"
                options={{
                    title: 'Tools',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="toolbox" size={size} color={color} />
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
