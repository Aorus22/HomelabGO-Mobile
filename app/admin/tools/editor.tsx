import * as React from 'react';
import { View, ActivityIndicator, Alert, Pressable, Platform, KeyboardAvoidingView, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { adminApi } from '@/services/api';
import { useColorScheme } from '@/lib/useColorScheme';

export default function FileEditorScreen() {
    const { path } = useLocalSearchParams<{ path: string }>();
    const { colors, colorScheme } = useColorScheme();
    const router = useRouter();

    const [content, setContent] = React.useState<string>('');
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const webViewRef = React.useRef<WebView>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const hiddenInputRef = React.useRef<TextInput>(null);

    React.useEffect(() => {
        if (path) {
            fetchContent();
        }
    }, [path]);

    const fetchContent = async () => {
        try {
            const data = await adminApi.getFile(path!);
            setContent(data.content || '');
        } catch (error) {
            Alert.alert('Error', 'Failed to load file content');
            router.back();
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSave = () => {
        setIsSaving(true);
        // Request content from WebView
        if (Platform.OS === 'web') {
            iframeRef.current?.contentWindow?.postMessage({ type: 'GET_CONTENT' }, '*');
        } else {
            webViewRef.current?.injectJavaScript(`
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SAVE_CONTENT',
                    payload: window.editor.getValue()
                }));
                true;
            `);
        }
    };

    const onMessage = async (event: any) => {
        // Handle message from WebView
        try {
            const data = typeof event.nativeEvent.data === 'string'
                ? JSON.parse(event.nativeEvent.data)
                : event.data;

            if (data.type === 'SAVE_CONTENT') {
                const newContent = data.payload;
                try {
                    await adminApi.saveFile(path!, newContent);
                    Alert.alert('Success', 'File saved');
                } catch (err) {
                    Alert.alert('Error', 'Failed to save file');
                } finally {
                    setIsSaving(false);
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    };

    // Listen for Web messages
    React.useEffect(() => {
        if (Platform.OS === 'web') {
            const handler = (event: MessageEvent) => {
                if (event.data && event.data.type === 'SAVE_CONTENT') {
                    onMessage({ data: event.data });
                }
            };
            window.addEventListener('message', handler);
            return () => window.removeEventListener('message', handler);
        }
    }, []);

    const htmlContent = React.useMemo(() => {
        if (content === null) return ''; // Wait for content

        const ext = path?.split('.').pop() || 'txt';
        let lang = 'plaintext';
        if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) lang = 'javascript';
        if (['html', 'xml'].includes(ext)) lang = 'html';
        if (['css'].includes(ext)) lang = 'css';
        if (['json'].includes(ext)) lang = 'json';
        if (['yaml', 'yml'].includes(ext)) lang = 'yaml';
        if (['go'].includes(ext)) lang = 'go';
        if (['py'].includes(ext)) lang = 'python';
        if (['sh', 'bash'].includes(ext)) lang = 'shell';
        if (['md'].includes(ext)) lang = 'markdown';
        if (['sql'].includes(ext)) lang = 'sql';
        if (['ini', 'conf', 'cfg', 'env'].includes(ext)) lang = 'ini';

        const escapedContent = JSON.stringify(content);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; background-color: ${colors.background}; }
        #container { width: 100%; height: 100%; }
        #hiddenInput { position: absolute; left: -9999px; opacity: 0; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js"></script>
</head>
<body>
    <input type="text" id="hiddenInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
    <div id="container"></div>
    <script>
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
        require(['vs/editor/editor.main'], function() {
            window.editor = monaco.editor.create(document.getElementById('container'), {
                value: ${escapedContent},
                language: '${lang}',
                theme: '${colorScheme === 'dark' ? 'vs-dark' : 'vs'}',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                scrollbar: { horizontal: 'auto', vertical: 'auto' }
            });

            setTimeout(function() { window.editor.focus(); }, 300);

            document.getElementById('container').addEventListener('click', function() {
                var hiddenInput = document.getElementById('hiddenInput');
                hiddenInput.focus();
                setTimeout(function() { window.editor.focus(); }, 50);
            });

            window.addEventListener('message', function(e) {
                if (e.data && e.data.type === 'GET_CONTENT') {
                     window.parent.postMessage({ type: 'SAVE_CONTENT', payload: window.editor.getValue() }, '*');
                }
            });
        });
    </script>
</body>
</html>
        `;
    }, [content, colorScheme]);

    if (initialLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
            <Stack.Screen
                options={{
                    title: path?.split('/').pop() || 'Edit File',
                    headerRight: () => (
                        <Pressable onPress={handleSave} disabled={isSaving} className="p-2">
                            {isSaving ? <ActivityIndicator size="small" /> : (
                                <Text className="font-bold text-primary">Save</Text>
                            )}
                        </Pressable>
                    )
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
            >
                {Platform.OS === 'web' ? (
                    <iframe
                        ref={iframeRef}
                        srcDoc={htmlContent}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                ) : (
                    <WebView
                        ref={webViewRef}
                        source={{ html: htmlContent }}
                        style={{ flex: 1 }}
                        onMessage={onMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        originWhitelist={['*']}
                        keyboardDisplayRequiresUserAction={false}
                        scrollEnabled={false}
                    />
                )}
            </KeyboardAvoidingView>

            {/* Hidden input for keyboard trigger helper */}
            <TextInput
                ref={hiddenInputRef}
                style={{ position: 'absolute', left: -9999, opacity: 0, height: 0 }}
                autoCorrect={false}
                autoCapitalize="none"
                onChangeText={(text) => {
                    if (text && webViewRef.current) {
                        const escaped = JSON.stringify(text);
                        webViewRef.current.injectJavaScript(`
                            if (window.editor) {
                                window.editor.trigger('keyboard', 'type', { text: ${escaped} });
                            }
                            true;
                        `);
                    }
                    hiddenInputRef.current?.clear();
                }}
                onKeyPress={(e) => {
                    if (e.nativeEvent.key === 'Backspace' && webViewRef.current) {
                        webViewRef.current.injectJavaScript(`
                            if (window.editor) { window.editor.trigger('keyboard', 'deleteLeft', {}); }
                            true;
                        `);
                    } else if (e.nativeEvent.key === 'Enter' && webViewRef.current) {
                        webViewRef.current.injectJavaScript(`
                            if (window.editor) { window.editor.trigger('keyboard', 'type', { text: '\\n' }); }
                            true;
                        `);
                    }
                }}
            />

            {/* Floating keyboard button for mobile friendliness */}
            {Platform.OS !== 'web' && (
                <Pressable
                    onPress={() => { hiddenInputRef.current?.focus(); }}
                    className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
                    style={{ elevation: 5 }}
                >
                    <MaterialCommunityIcons name="keyboard" size={24} color="white" />
                </Pressable>
            )}
        </SafeAreaView>
    );
}
