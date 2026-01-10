import * as React from 'react';
import { View, Alert, ActivityIndicator, Platform, TextInput, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { envFilesApi } from '@/services/api';

interface EnvFileDetail {
    id: number;
    name: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export default function EnvFileEditorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDarkColorScheme } = useColorScheme();

    const [envFile, setEnvFile] = React.useState<EnvFileDetail | null>(null);
    const [content, setContent] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    const originalContentRef = React.useRef('');

    const hasChanges = content !== originalContentRef.current;

    const fetchEnvFile = async () => {
        try {
            if (!id) return;
            const data = await envFilesApi.get(parseInt(id, 10));
            setEnvFile(data);
            setContent(data.content || '');
            originalContentRef.current = data.content || '';
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load env file');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchEnvFile();
    }, [id]);

    const handleSave = async () => {
        if (!envFile) return;
        setIsSaving(true);
        try {
            await envFilesApi.update(envFile.id, { content });
            originalContentRef.current = content; // Update original so hasChanges becomes false
            Alert.alert('Success', 'Env file saved');
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        if (!envFile) return;
        Alert.alert(
            'Delete Env File',
            `Are you sure you want to delete "${envFile.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await envFilesApi.delete(envFile.id);
                            router.back();
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete');
                        }
                    },
                },
            ]
        );
    };

    if (isLoading || !envFile) {
        return (
            <SafeAreaView className="flex-1 bg-background justify-center items-center">
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Stack.Screen
                options={{
                    title: envFile.name,
                    headerBackTitle: 'Back',
                    headerRight: () => (
                        <View className="flex-row items-center gap-2">
                            <Pressable onPress={handleDelete} className="p-2">
                                <MaterialCommunityIcons name="trash-can" size={22} color="#ef4444" />
                            </Pressable>
                        </View>
                    )
                }}
            />

            <View className="flex-1 p-4">
                {/* Editor Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                        <MaterialCommunityIcons name="file-document" size={20} color={colors.primary} />
                        <Text variant="callout" color="tertiary">{envFile.name}</Text>
                    </View>
                    {hasChanges && (
                        <View className="bg-yellow-500/20 px-2 py-1 rounded-full">
                            <Text variant="caption2" className="text-yellow-600 dark:text-yellow-400">Unsaved</Text>
                        </View>
                    )}
                </View>

                {/* Editor */}
                <View className="flex-1 bg-zinc-900 rounded-xl overflow-hidden">
                    <TextInput
                        value={content}
                        onChangeText={setContent}
                        multiline
                        className="flex-1 p-4 text-zinc-100 font-mono"
                        style={{
                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                            fontSize: 13,
                            lineHeight: 20,
                            textAlignVertical: 'top',
                        }}
                        placeholder="# Environment Variables&#10;&#10;KEY=value&#10;DATABASE_URL=postgres://..."
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                    />
                </View>

                {/* Help Text */}
                <Text variant="caption2" color="tertiary" className="mt-2 mx-1">
                    Format: KEY=value (one per line). Lines starting with # are comments.
                </Text>

                {/* Save Button */}
                <Button
                    className="mt-4 bg-primary py-4"
                    onPress={handleSave}
                    disabled={isSaving || !hasChanges}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View className="flex-row items-center justify-center">
                            <MaterialCommunityIcons name="content-save" size={20} color="white" />
                            <Text className="text-white font-semibold ml-2">Save</Text>
                        </View>
                    )}
                </Button>
            </View>
        </SafeAreaView>
    );
}
