import * as React from 'react';
import { View, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useAuth } from '@/context/auth';
import { createWebSocket } from '@/services/api';

export default function HostTerminalScreen() {
    const { token } = useAuth();
    const [isConnecting, setIsConnecting] = React.useState(true);
    const [output, setOutput] = React.useState<string[]>(['Connecting to host terminal...']);
    const [input, setInput] = React.useState('');
    const wsRef = React.useRef<WebSocket | null>(null);
    const scrollViewRef = React.useRef<ScrollView>(null);

    React.useEffect(() => {
        const connect = async () => {
            try {
                if (!token) return;

                // Add host=true or specific path for host terminal
                const ws = await createWebSocket(`/ws/admin/terminal`, token);

                ws.onopen = () => {
                    setIsConnecting(false);
                    setOutput(prev => [...prev, 'Connected to host shell.']);
                };

                ws.onmessage = (e) => {
                    const msg = e.data;
                    setOutput(prev => {
                        const newLines = msg.split('\n');
                        // Limit buffer size
                        const result = [...prev, ...newLines];
                        if (result.length > 500) {
                            return result.slice(result.length - 500);
                        }
                        return result;
                    });
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
                };

                ws.onerror = (e) => {
                    setOutput(prev => [...prev, 'Error: WebSocket connection failed']);
                    setIsConnecting(false);
                };

                ws.onclose = () => {
                    setOutput(prev => [...prev, 'Disconnected.']);
                };

                wsRef.current = ws;
            } catch (err) {
                setOutput(prev => [...prev, `Failed to connect: ${err}`]);
                setIsConnecting(false);
            }
        };

        connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const sendCommand = () => {
        if (!wsRef.current || !input.trim()) return;

        // Echo input
        setOutput(prev => [...prev, `$ ${input}`]);

        wsRef.current.send(input);
        setInput('');
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: 'Host Terminal' }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1 bg-black"
            >
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1 p-2"
                    contentContainerClassName="pb-4"
                >
                    {output.map((line, index) => (
                        <Text
                            key={index}
                            className="font-mono text-green-500 text-xs sm:text-sm"
                            style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
                        >
                            {line}
                        </Text>
                    ))}
                    {isConnecting && (
                        <ActivityIndicator color="#22c55e" className="mt-2" />
                    )}
                </ScrollView>

                <View className="p-2 bg-zinc-900 border-t border-zinc-800 flex-row items-center">
                    <Text className="text-green-500 font-mono mr-2">$</Text>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={sendCommand}
                        returnKeyType="send"
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Type command..."
                        placeholderTextColor="#444"
                        className="flex-1 text-white font-mono h-10"
                        style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
                    />
                </View>
            </KeyboardAvoidingView>
        </>
    );
}
