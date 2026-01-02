import * as React from 'react';
import { View, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/nativewindui/Text';
import { API_BASE_URL, tokenStorage } from '@/services/api';

export default function ContainerLogsScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const [token, setToken] = React.useState<string | null>(null);
    const webViewRef = React.useRef<WebView>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    React.useEffect(() => {
        tokenStorage.get().then(setToken);
    }, []);

    const htmlContent = React.useMemo(() => {
        if (!token || !id) return '';

        const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
        const wsBase = API_BASE_URL.replace(/https?:\/\//, '');
        // WebSocket endpoint for logs
        const wsUrl = `${wsProtocol}://${wsBase}/ws/logs/${id}?token=${token}`;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Logs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
    <style>
        body, html { 
            margin: 0; 
            padding: 0; 
            height: 100%; 
            width: 100%; 
            background-color: #000; 
            overflow: hidden; 
        }
        #terminal { 
            height: 100%; 
            width: 100%; 
            padding-left: 5px; 
        }
        .xterm-viewport {
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div id="terminal"></div>
    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
    <script>
        window.onload = function() {
            const term = new Terminal({
                cursorBlink: false, // No cursor for logs
                disableStdin: true, // Read-only
                theme: {
                    background: '#000000',
                    foreground: '#ffffff',
                    cursor: '#000000', // Hide cursor
                    selection: '#555555'
                },
                fontSize: 14,
                fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
                allowProposedApi: true,
                convertEol: true // Ensure newlines are handled correctly if raw text
            });
            
            const fitAddon = new FitAddon.FitAddon();
            term.loadAddon(fitAddon);
            
            term.open(document.getElementById('terminal'));
            fitAddon.fit();

            window.addEventListener('resize', () => fitAddon.fit());

            window.socket = new WebSocket("${wsUrl}");

            window.socket.onopen = () => {
                term.write('\\x1b[32mHomelabGO: Connected to Container Logs\\x1b[0m\\r\\n');
                fitAddon.fit();
            };

            window.socket.onmessage = (event) => {
                // Determine if we receive raw text or JSON lines? 
                // Usually Docker logs stream raw lines. 
                // Xterm writes them directly.
                term.write(event.data);
            };

            window.socket.onclose = () => {
                term.write('\\r\\n\\x1b[31mConnection closed.\\x1b[0m\\r\\n');
            };

            window.socket.onerror = (e) => {
                term.write('\\r\\n\\x1b[31mConnection error.\\x1b[0m\\r\\n');
            };

            document.addEventListener('touchmove', function(e) {
                e.preventDefault();
            }, { passive: false });
        };
    </script>
</body>
</html>
        `;
    }, [token, id]);

    return (
        <SafeAreaView className="flex-1 bg-black" edges={['top']}>
            <Stack.Screen
                options={{
                    title: `Logs: ${name || id?.substring(0, 8)}`,
                    headerStyle: { backgroundColor: '#000000' },
                    headerTintColor: '#ffffff',
                    headerRight: undefined, // Remove refresh button as WS is live
                }}
            />

            {!token ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text className="text-white mt-4">Preparing logs...</Text>
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    {Platform.OS === 'web' ? (
                        <View className="flex-1">
                            <iframe
                                ref={iframeRef}
                                srcDoc={htmlContent}
                                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
                            />
                        </View>
                    ) : (
                        <WebView
                            ref={webViewRef}
                            source={{ html: htmlContent }}
                            style={{ flex: 1, backgroundColor: '#000000' }}
                            containerStyle={{ flex: 1, backgroundColor: '#000000' }}
                            originWhitelist={['*']}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            scrollEnabled={false}
                            overScrollMode="never"
                            bounces={false}
                            keyboardDisplayRequiresUserAction={false}
                            hideKeyboardAccessoryView={true}
                            onError={(syntheticEvent) => {
                                const { nativeEvent } = syntheticEvent;
                                console.warn('WebView error: ', nativeEvent);
                            }}
                        />
                    )}
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
