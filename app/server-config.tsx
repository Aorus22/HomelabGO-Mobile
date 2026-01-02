import * as React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { systemApi, serverStorage, API_BASE_URL } from '@/services/api';

export default function ServerConfigScreen() {
    const { colors } = useColorScheme();
    const [url, setUrl] = React.useState('https://');
    const [isValidating, setIsValidating] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Load existing URL if any
        serverStorage.get().then(stored => {
            if (stored) setUrl(stored);
            else setUrl(API_BASE_URL);
        });
    }, []);

    const handleConnect = async () => {
        if (!url) {
            setError('Please enter a server URL');
            return;
        }

        setError(null);
        setIsValidating(true);

        try {
            // Basic URL format validation
            let formattedUrl = url.trim();
            if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
                formattedUrl = `https://${formattedUrl}`;
            }

            // Validate against server
            const isValid = await systemApi.validateServer(formattedUrl);

            if (isValid) {
                await serverStorage.set(formattedUrl);
                // Navigate to login
                router.replace('/(auth)/login');
            } else {
                setError('Could not connect to HomelabGO server. Please check the URL.');
            }
        } catch (e) {
            setError('Connection failed.');
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerClassName="flex-grow justify-center p-6">
                    <View className="items-center mb-8">
                        <View className="w-24 h-24 bg-primary/10 rounded-3xl items-center justify-center mb-4">
                            <MaterialCommunityIcons name="server-network" size={48} color={colors.primary} />
                        </View>
                        <Text variant="title1" className="font-bold text-center">
                            HomelabGO
                        </Text>
                        <Text variant="subhead" color="tertiary" className="text-center mt-2">
                            Connect to your personal server
                        </Text>
                    </View>

                    <View className="gap-4">
                        <View>
                            <Text variant="caption1" className="mb-1.5 ml-1 font-medium">
                                Server URL
                            </Text>
                            <TextInput
                                value={url}
                                onChangeText={(text) => {
                                    setUrl(text);
                                    setError(null);
                                }}
                                placeholder="https://homelab.example.com"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="done"
                                onSubmitEditing={handleConnect}
                                className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                                style={{ color: colors.foreground }}
                            />
                        </View>

                        <View className="flex-row items-center bg-destructive/10 p-3 rounded-lg">
                            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.destructive} />
                            <Text className="ml-2 flex-1 text-sm text-destructive">
                                {error}
                            </Text>
                        </View>

                        <Button
                            size="lg"
                            onPress={handleConnect}
                            disabled={isValidating}
                            className={isValidating ? 'opacity-70' : ''}
                        >
                            {isValidating ? (
                                <Text className="text-white font-medium">Connecting...</Text>
                            ) : (
                                <Text className="text-white font-medium">Connect to Server</Text>
                            )}
                        </Button>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
