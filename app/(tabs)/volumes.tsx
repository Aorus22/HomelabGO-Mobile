import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as DocumentPicker from 'expo-document-picker';
import { downloadAsync, documentDirectory } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Text } from '@/components/nativewindui/Text';
import { useFocusEffect } from 'expo-router';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { volumesApi, API_BASE_URL, tokenStorage } from '@/services/api';

interface Volume {
    id: number;
    name: string;
    volume_name: string;
    mount_path: string;
    created_at: string;
}

export default function VolumesScreen() {
    const { colors } = useColorScheme();
    const { showActionSheetWithOptions } = useActionSheet();
    const [volumes, setVolumes] = React.useState<Volume[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [showCreate, setShowCreate] = React.useState(false);
    const [newVolumeName, setNewVolumeName] = React.useState('');
    const [isCreating, setIsCreating] = React.useState(false);

    // Upload modal
    const [showUpload, setShowUpload] = React.useState(false);
    const [uploadName, setUploadName] = React.useState('');
    const [uploadFile, setUploadFile] = React.useState<any>(null);
    const [isUploading, setIsUploading] = React.useState(false);

    const fetchVolumes = async () => {
        try {
            const data = await volumesApi.list();
            setVolumes(data);
        } catch (error) {
            console.error('Failed to fetch volumes:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchVolumes();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchVolumes();
    };

    const handleCreate = async () => {
        if (!newVolumeName.trim()) return;

        setIsCreating(true);
        try {
            await volumesApi.create(newVolumeName.trim());
            setNewVolumeName('');
            setShowCreate(false);
            fetchVolumes();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create volume');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = (volume: Volume) => {
        Alert.alert(
            'Delete Volume',
            `Are you sure you want to delete "${volume.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await volumesApi.delete(volume.id);
                            fetchVolumes();
                        } catch (error) {
                            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete');
                        }
                    },
                },
            ]
        );
    };

    const showVolumeActions = (volume: Volume) => {
        const options = ['Delete', 'Download', 'Cancel'];
        const destructiveButtonIndex = 0;
        const cancelButtonIndex = 2;

        showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                containerStyle: { backgroundColor: colors.card },
                textStyle: { color: colors.foreground },
            },
            async (buttonIndex) => {
                switch (buttonIndex) {
                    case 0: // Delete
                        handleDelete(volume);
                        break;
                    case 1: // Download
                        await handleDownload(volume);
                        break;
                }
            }
        );
    };

    const handleDownload = async (volume: Volume) => {
        try {
            const token = await tokenStorage.get();
            const downloadUrl = `${API_BASE_URL}/volumes/${volume.id}/download`;
            const fileUri = documentDirectory + `${volume.name}.tar.gz`;

            Alert.alert('Downloading', 'Please wait...');

            const downloadResult = await downloadAsync(
                downloadUrl,
                fileUri,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
            );

            if (downloadResult.status === 200) {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: 'application/gzip',
                        dialogTitle: `Save ${volume.name}.tar.gz`,
                    });
                } else {
                    Alert.alert('Downloaded', `File saved to: ${downloadResult.uri}`);
                }
            } else {
                Alert.alert('Error', 'Download failed');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to download volume');
            console.error(error);
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/gzip', 'application/x-gzip', 'application/x-tar', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            setUploadFile(result.assets[0]);
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleUpload = async () => {
        if (!uploadName.trim() || !uploadFile) return;

        setIsUploading(true);
        try {
            await volumesApi.upload(uploadName.trim(), uploadFile);
            setUploadName('');
            setUploadFile(null);
            setShowUpload(false);
            fetchVolumes();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload');
        } finally {
            setIsUploading(false);
        }
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
                {volumes.length === 0 ? (
                    <View className="items-center py-12">
                        <MaterialCommunityIcons name="harddisk" size={48} color={colors.grey} />
                        <Text variant="title3" className="mt-4 mb-2">No Volumes</Text>
                        <Text color="tertiary" className="text-center">
                            Create a volume to store persistent data
                        </Text>
                    </View>
                ) : (
                    volumes.map((volume) => (
                        <View
                            key={volume.id}
                            className="bg-card border border-border rounded-xl p-4"
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text variant="body" className="font-semibold">{volume.name}</Text>
                                    <Text variant="caption1" color="tertiary" className="font-mono mt-1">
                                        {volume.mount_path}
                                    </Text>
                                </View>
                                <Pressable
                                    onPress={() => showVolumeActions(volume)}
                                    className="p-2 -mr-2"
                                >
                                    <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.grey} />
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => {
                    const options = ['Create New Volume', 'Upload Volume', 'Cancel'];
                    const cancelButtonIndex = 2;

                    showActionSheetWithOptions(
                        {
                            options,
                            cancelButtonIndex,
                            containerStyle: { backgroundColor: colors.card },
                            textStyle: { color: colors.foreground },
                        },
                        (buttonIndex) => {
                            switch (buttonIndex) {
                                case 0:
                                    setShowCreate(true);
                                    break;
                                case 1:
                                    setShowUpload(true);
                                    break;
                            }
                        }
                    );
                }}
                className="absolute bottom-6 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
                style={{ elevation: 4 }}
            >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
            </Pressable>

            {/* Create Modal */}
            <Modal
                visible={showCreate}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCreate(false)}
            >
                <KeyboardAvoidingView
                    behavior="padding"
                    className="flex-1"
                >
                    <Pressable
                        className="flex-1 bg-black/50 items-center justify-center p-6"
                        onPress={() => setShowCreate(false)}
                    >
                        <Pressable
                            className="bg-card border border-border rounded-2xl w-full max-w-md p-6"
                            onPress={(e) => e.stopPropagation()}
                        >
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text variant="title3" className="font-semibold mb-4">Create Volume</Text>

                                <Text variant="footnote" className="mb-2 text-muted-foreground">
                                    Volume Name
                                </Text>
                                <TextInput
                                    value={newVolumeName}
                                    onChangeText={setNewVolumeName}
                                    placeholder="e.g., mydata"
                                    placeholderTextColor={colors.grey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    onSubmitEditing={handleCreate}
                                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground mb-6"
                                    style={{ color: colors.foreground }}
                                />

                                <View className="flex-row gap-3">
                                    <Pressable
                                        onPress={() => setShowCreate(false)}
                                        className="flex-1 items-center justify-center py-3 rounded-xl border border-border"
                                    >
                                        <Text className="text-foreground font-medium">Cancel</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={handleCreate}
                                        disabled={isCreating || !newVolumeName.trim()}
                                        className={`flex-1 items-center justify-center py-3 rounded-xl ${!newVolumeName.trim() ? 'bg-primary/50' : 'bg-primary'}`}
                                    >
                                        {isCreating ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text className="text-white font-medium">Create</Text>
                                        )}
                                    </Pressable>
                                </View>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>

            {/* Upload Modal */}
            <Modal
                visible={showUpload}
                transparent
                animationType="fade"
                onRequestClose={() => setShowUpload(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                >
                    <Pressable
                        className="flex-1 bg-black/50 items-center justify-center p-6"
                        onPress={() => setShowUpload(false)}
                    >
                        <Pressable
                            className="bg-card border border-border rounded-2xl w-full max-w-md p-6"
                            onPress={(e) => e.stopPropagation()}
                        >
                            <Text variant="title3" className="font-semibold mb-4">Upload Volume</Text>

                            <Text variant="footnote" className="mb-2 text-muted-foreground">
                                Volume Name
                            </Text>
                            <TextInput
                                value={uploadName}
                                onChangeText={setUploadName}
                                placeholder="e.g., mydata"
                                placeholderTextColor={colors.grey}
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="bg-background border border-border rounded-xl px-4 py-3 text-foreground mb-4"
                                style={{ color: colors.foreground }}
                            />

                            <Text variant="footnote" className="mb-2 text-muted-foreground">
                                Archive File (tar.gz)
                            </Text>
                            <Pressable
                                onPress={handlePickFile}
                                className="bg-background border border-border rounded-xl px-4 py-3 flex-row items-center justify-between mb-6"
                            >
                                <Text color={uploadFile ? 'primary' : 'tertiary'}>
                                    {uploadFile ? uploadFile.name : 'Select file...'}
                                </Text>
                                <MaterialCommunityIcons name="file-upload" size={20} color={colors.grey} />
                            </Pressable>

                            <View className="flex-row gap-3">
                                <Pressable
                                    onPress={() => {
                                        setShowUpload(false);
                                        setUploadFile(null);
                                        setUploadName('');
                                    }}
                                    className="flex-1 items-center justify-center py-3 rounded-xl border border-border"
                                >
                                    <Text className="text-foreground font-medium">Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleUpload}
                                    disabled={isUploading || !uploadName.trim() || !uploadFile}
                                    className={`flex-1 items-center justify-center py-3 rounded-xl ${!uploadName.trim() || !uploadFile ? 'bg-primary/50' : 'bg-primary'}`}
                                >
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text className="text-white font-medium">Upload</Text>
                                    )}
                                </Pressable>
                            </View>
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}
