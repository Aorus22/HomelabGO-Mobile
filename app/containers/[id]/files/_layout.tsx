import { Stack } from 'expo-router';

export default function FilesLayout() {
    return (
        <Stack screenOptions={{ headerShown: true }}>
            <Stack.Screen name="index" options={{ title: 'Files' }} />
            <Stack.Screen name="edit" options={{ title: 'Edit File' }} />
        </Stack>
    );
}
