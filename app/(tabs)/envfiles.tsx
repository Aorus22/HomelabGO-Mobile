import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, TextInput, Modal } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useActionSheet } from '@expo/react-native-action-sheet';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { envFilesApi } from '@/services/api';
import { router, useFocusEffect } from 'expo-router';

interface EnvFile {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

export default function EnvFilesScreen() {
    const { colors, isDarkColorScheme } = useColorScheme();
    const { showActionSheetWithOptions } = useActionSheet();
    const [envFiles, setEnvFiles] = React.useState<EnvFile[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);
    const [newFileName, setNewFileName] = React.useState('');
    const [creating, setCreating] = React.useState(false);

    const fetchEnvFiles = async () => {
        try {
            const data = await envFilesApi.list();
            setEnvFiles(data);
        } catch (error) {
            console.error('Failed to fetch env files:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchEnvFiles();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchEnvFiles();
    };

    const handleCreate = async () => {
        if (!newFileName.trim()) {
            Alert.alert('Error', 'Please enter a file name');
            return;
        }

        setCreating(true);
        try {
            const created = await envFilesApi.create(newFileName.trim(), '');
            setShowModal(false);
            setNewFileName('');
            // Navigate to editor
            router.push({
                pathname: '/envfiles/[id]' as any,
                params: { id: created.id }
            });
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create env file');
        } finally {
            setCreating(false);
        }
    };

    const handleEnvFilePress = (envFile: EnvFile) => {
        router.push({
            pathname: '/envfiles/[id]' as any,
            params: { id: envFile.id }
        });
    };

    const handleDelete = async (envFile: EnvFile) => {
        try {
            await envFilesApi.delete(envFile.id);
            fetchEnvFiles();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete');
        }
    };

    const showEnvFileActions = (envFile: EnvFile) => {
        const options = ['Edit', 'Delete', 'Cancel'];
        const destructiveButtonIndex = 1;
        const cancelButtonIndex = 2;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                containerStyle: { backgroundColor: colors.card },
                textStyle: { color: colors.foreground },
            },
            (buttonIndex) => {
                switch (buttonIndex) {
                    case 0: // Edit
                        handleEnvFilePress(envFile);
                        break;
                    case 1: // Delete
                        Alert.alert(
                            'Delete Env File',
                            `Are you sure you want to delete "${envFile.name}"?`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => handleDelete(envFile),
                                },
                            ]
                        );
                        break;
                }
            }
        );
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView
                contentContainerClassName="p-4 gap-3"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {envFiles.length === 0 ? (
                    <View className="items-center py-12">
                        <MaterialCommunityIcons name="file-document-edit" size={48} color={colors.grey} />
                        <Text variant="title3" className="mt-4 mb-2">No Env Files</Text>
                        <Text color="tertiary" className="text-center">
                            Create an env file to manage environment variables
                        </Text>
                    </View>
                ) : (
                    envFiles.map((envFile) => (
                        <Pressable
                            key={envFile.id}
                            onPress={() => handleEnvFilePress(envFile)}
                            className="bg-card border border-border rounded-xl p-4 active:bg-zinc-100 dark:active:bg-zinc-800"
                        >
                            <View className="flex-row items-center gap-3">
                                <MaterialCommunityIcons name="file-document" size={24} color={colors.primary} />
                                <View className="flex-1">
                                    <Text variant="body" className="font-semibold">{envFile.name}</Text>
                                    <Text variant="caption1" color="tertiary">
                                        Updated: {new Date(envFile.updated_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => showEnvFileActions(envFile)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    className="p-2"
                                >
                                    <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.grey} />
                                </Pressable>
                            </View>
                        </Pressable>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => setShowModal(true)}
                className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
                style={{ elevation: 4 }}
            >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
            </Pressable>

            {/* Create Modal */}
            <Modal
                visible={showModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowModal(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-4">
                    <View className="bg-card w-full max-w-sm p-6 rounded-xl border border-border">
                        <Text variant="title3" className="mb-4 font-bold">Create Env File</Text>
                        <TextInput
                            className="p-3 rounded-lg mb-4"
                            style={{ backgroundColor: isDarkColorScheme ? '#27272a' : '#f4f4f5', color: colors.foreground }}
                            placeholder="e.g. database.env"
                            placeholderTextColor={colors.grey}
                            value={newFileName}
                            onChangeText={setNewFileName}
                            autoFocus
                        />
                        <View className="flex-row justify-end gap-3">
                            <Button variant="secondary" onPress={() => {
                                setShowModal(false);
                                setNewFileName('');
                            }}>
                                <Text>Cancel</Text>
                            </Button>
                            <Button onPress={handleCreate} disabled={creating}>
                                {creating ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white">Create</Text>
                                )}
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
