import * as React from 'react';
import { View, Platform, Alert, Pressable, ActivityIndicator, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/nativewindui/Text';
import { API_BASE_URL, tokenStorage } from '@/services/api';

export default function ContainerExecScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
    const [selectedShell, setSelectedShell] = React.useState('/bin/sh');
    const [token, setToken] = React.useState<string | null>(null);
    const shells = ['/bin/sh', '/bin/bash', '/bin/ash', '/bin/zsh'];
    const webViewRef = React.useRef<WebView>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    React.useEffect(() => {
        tokenStorage.get().then(setToken);
    }, []);

    const handleKey = (key: string) => {
        let payload = key;
        // Handle special keys
        switch (key) {
            case 'ESC': payload = '\\x1b'; break;
            case 'TAB': payload = '\\t'; break;
            case 'UP': payload = '\\x1b[A'; break;
            case 'DOWN': payload = '\\x1b[B'; break;
            case 'LEFT': payload = '\\x1b[D'; break;
            case 'RIGHT': payload = '\\x1b[C'; break;
            case 'CTRL+C': payload = '\\x03'; break;
            case 'CTRL+Z': payload = '\\x1a'; break;
            case 'HOME': payload = '\\x1b[H'; break;
            case 'END': payload = '\\x1b[F'; break;
            default: break;
        }

        if (Platform.OS === 'web') {
            // Send payload to iframe via postMessage
            // HTML content listens for 'SEND_KEY' message
            iframeRef.current?.contentWindow?.postMessage({ type: 'SEND_KEY', payload }, '*');
        } else {
            // Send directly via the WebSocket instance in the WebView
            webViewRef.current?.injectJavaScript(`
                if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                    window.socket.send('${payload}');
                }
                true;
            `);
        }
    };

    const ToolbarButton = ({ label, code }: { label: string, code: string }) => (
        <Pressable
            onPress={() => handleKey(code)}
            className="px-3 py-2 bg-zinc-800 rounded mr-2 min-w-[40px] items-center justify-center active:bg-zinc-700"
        >
            <Text className="text-white font-mono text-xs font-bold">{label}</Text>
        </Pressable>
    );

    const htmlContent = React.useMemo(() => {
        if (!token || !id) return '';

        const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
        const wsBase = API_BASE_URL.replace(/https?:\/\//, '');
        const wsUrl = `${wsProtocol}://${wsBase}/ws/exec/${id}?shell=${selectedShell}&token=${token}`;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Terminal</title>
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
            padding-left: 5px; /* Slight padding */
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
                cursorBlink: true,
                theme: {
                    background: '#000000',
                    foreground: '#ffffff',
                    cursor: '#22c55e',
                    selection: '#555555'
                },
                fontSize: 14,
                fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
                allowProposedApi: true
            });
            
            const fitAddon = new FitAddon.FitAddon();
            term.loadAddon(fitAddon);
            
            term.open(document.getElementById('terminal'));
            fitAddon.fit();

            window.addEventListener('resize', () => fitAddon.fit());

            // Make WS global so we can access it from injected JS
            window.socket = new WebSocket("${wsUrl}");

            window.socket.onopen = () => {
                term.write('\\r\\n\\x1b[32mHomelabGO: Connected via xterm.js\\x1b[0m\\r\\n');
                fitAddon.fit();
                term.focus(); 
            };

            window.socket.onmessage = (event) => {
                term.write(event.data);
            };

            window.socket.onclose = () => {
                term.write('\\r\\n\\x1b[31mConnection closed.\\x1b[0m\\r\\n');
            };

            window.socket.onerror = (e) => {
                term.write('\\r\\n\\x1b[31mConnection error.\\x1b[0m\\r\\n');
            };

            term.onData(data => {
                if (window.socket.readyState === WebSocket.OPEN) {
                    window.socket.send(data);
                }
            });

            // Listen for postMessage (from Web parent)
            window.addEventListener('message', (e) => {
                 if (e.data && e.data.type === 'SEND_KEY') {
                     if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                         window.socket.send(e.data.payload);
                     }
                 }
            });

            document.addEventListener('touchmove', function(e) {
                e.preventDefault();
            }, { passive: false });
        };
    </script>
</body>
</html>
        `;
    }, [token, id, selectedShell]);

    return (
        <SafeAreaView className="flex-1 bg-black" edges={['top']}>
            <Stack.Screen
                options={{
                    title: `Terminal: ${name || id?.substring(0, 8)}`,
                    headerRight: () => (
                        <Pressable
                            onPress={() => {
                                Alert.alert('Select Shell', 'Choose a shell to use', [
                                    ...shells.map(s => ({ text: s, onPress: () => setSelectedShell(s) })),
                                    { text: 'Cancel', style: 'cancel' }
                                ]);
                            }}
                            className="px-2 py-1 bg-zinc-800 rounded mr-2"
                        >
                            <Text className="text-white text-xs font-mono">{selectedShell}</Text>
                        </Pressable>
                    ),
                    headerStyle: { backgroundColor: '#000000' },
                    headerTintColor: '#ffffff',
                }}
            />

            {!token ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#22c55e" />
                    <Text className="text-white mt-4">Preparing session...</Text>
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

                    {/* Helper Toolbar */}
                    <View className="bg-zinc-900 border-t border-zinc-800 py-1 pb-2">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2" keyboardShouldPersistTaps="handled">
                            <ToolbarButton label="ESC" code="ESC" />
                            <ToolbarButton label="TAB" code="TAB" />
                            <ToolbarButton label="CTRL+C" code="CTRL+C" />
                            <ToolbarButton label="CTRL+Z" code="CTRL+Z" />
                            <ToolbarButton label="↑" code="UP" />
                            <ToolbarButton label="↓" code="DOWN" />
                            <ToolbarButton label="←" code="LEFT" />
                            <ToolbarButton label="→" code="RIGHT" />
                            <ToolbarButton label="/" code="/" />
                            <ToolbarButton label="-" code="-" />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
