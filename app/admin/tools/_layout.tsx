import { Stack } from 'expo-router';

export default function AdminToolsLayout() {
    return (
        <Stack screenOptions={{ headerShown: true }}>
            <Stack.Screen name="index" options={{ title: 'Tools' }} />
            <Stack.Screen name="speedtest" options={{ title: 'Speedtest' }} />
            <Stack.Screen name="terminal" options={{ title: 'Host Terminal' }} />
            <Stack.Screen name="files" options={{ title: 'File Manager' }} />
            <Stack.Screen name="editor" options={{ title: 'Editor' }} />
            <Stack.Screen name="cron-manager" options={{ title: 'Cron Manager' }} />
            <Stack.Screen name="services" options={{ title: 'System Services' }} />
            <Stack.Screen name="ports" options={{ title: 'Port Manager' }} />
            <Stack.Screen name="network-interfaces" options={{ title: 'Network Interfaces' }} />
            <Stack.Screen name="processes" options={{ title: 'Process Manager' }} />
            <Stack.Screen name="firewall" options={{ title: 'Firewall Manager' }} />
        </Stack>
    );
}
