import { Stack } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';

export default function DockerLayout() {
    const { colors } = useColorScheme();
    return (
        <Stack screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.foreground,
        }}>
            <Stack.Screen name="index" options={{ title: 'Docker Management' }} />
            <Stack.Screen name="containers" options={{ title: 'Containers' }} />
            <Stack.Screen name="images" options={{ title: 'Images' }} />
            <Stack.Screen name="networks" options={{ title: 'Networks' }} />
            <Stack.Screen name="volumes" options={{ title: 'Volumes' }} />
        </Stack>
    );
}
