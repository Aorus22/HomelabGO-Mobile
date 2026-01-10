import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, TextInput, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';

// Note: This file manager works with the backend's /files endpoint
// which accesses the DATA_VOLUME_PATH configured in the backend

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    mod_time: string;
}

export default function HostFilesScreen() {
    const { colors } = useColorScheme();
    const router = useRouter();
    const [currentPath, setCurrentPath] = React.useState('/');
    const [files, setFiles] = React.useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [showNewFolderModal, setShowNewFolderModal] = React.useState(false);
    const [newFolderName, setNewFolderName] = React.useState('');

    // Import directly to avoid circular deps
    const fetchFiles = async () => {
        try {
            const { adminApi } = await import('@/services/api');
            const data = await adminApi.listFiles(currentPath);
            setFiles(data.files || []);
        } catch (error) {
            console.error('Failed to fetch files:', error);
            setFiles([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        fetchFiles();
    }, [currentPath]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFiles();
    };

    const handleFilePress = (file: FileItem) => {
        if (file.is_dir) {
            setCurrentPath(file.path);
        } else {
            // Open editor
            router.push({
                pathname: '/admin/tools/editor',
                params: { path: file.path }
            });
        }
    };

    const navigateUp = () => {
        // Handle root paths (unix '/' or windows 'C:\')
        if (currentPath === '/' || currentPath.match(/^[a-zA-Z]:\\?$/)) return;

        // Normalize separators to / for manipulation, though backend handles both
        const normalized = currentPath.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        parts.pop();

        // If empty after pop, it's root
        if (parts.length === 0) {
            setCurrentPath('/');
            return;
        }

        // Reconstruct path
        // If original was windows-like (had drive letter), keep it
        if (currentPath.match(/^[a-zA-Z]:/)) {
            // Windows path reconstruction
            setCurrentPath(parts.join('\\') || '\\');
        } else {
            // Unix path
            setCurrentPath('/' + parts.join('/'));
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (file: FileItem) => {
        if (file.is_dir) return 'folder';
        const ext = file.name.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'txt':
            case 'md':
                return 'file-document';
            case 'js':
            case 'ts':
            case 'py':
            case 'go':
                return 'file-code';
            case 'json':
            case 'yaml':
            case 'yml':
                return 'code-json';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
                return 'file-image';
            default:
                return 'file';
        }
    };

    if (isLoading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: true, title: 'File Manager' }} />
                <View className="flex-1 bg-background items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ headerShown: true, title: 'File Manager' }} />
            <View className="flex-1 bg-background">
                {/* Path Bar */}
                <View className="flex-row items-center gap-2 p-3 bg-card border-b border-border">
                    <Pressable
                        onPress={navigateUp}
                        disabled={currentPath === '/'}
                        className={`p-2 rounded-lg ${currentPath === '/' ? 'opacity-50' : 'active:bg-zinc-200 dark:active:bg-zinc-700'}`}
                    >
                        <MaterialCommunityIcons name="arrow-up" size={20} color={colors.foreground} />
                    </Pressable>
                    <View className="flex-1 bg-background rounded-lg px-3 py-2">
                        <Text className="font-mono text-sm" numberOfLines={1}>
                            {currentPath}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => setShowNewFolderModal(true)}
                        className="p-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                    >
                        <MaterialCommunityIcons name="folder-plus" size={20} color={colors.primary} />
                    </Pressable>
                </View>

                {/* File List */}
                <ScrollView
                    contentContainerClassName="p-2"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {files.length === 0 ? (
                        <View className="items-center py-12">
                            <MaterialCommunityIcons name="folder-open" size={48} color={colors.grey} />
                            <Text color="tertiary" className="mt-2">Empty directory</Text>
                        </View>
                    ) : (
                        files.map((file) => (
                            <Pressable
                                key={file.path}
                                onPress={() => handleFilePress(file)}
                                className="flex-row items-center gap-3 p-3 rounded-lg active:bg-zinc-100 dark:active:bg-zinc-800"
                            >
                                <MaterialCommunityIcons
                                    name={getFileIcon(file)}
                                    size={24}
                                    color={file.is_dir ? '#f59e0b' : colors.grey}
                                />
                                <View className="flex-1">
                                    <Text className="font-medium">{file.name}</Text>
                                    {!file.is_dir && (
                                        <Text variant="caption2" color="tertiary">
                                            {formatSize(file.size)}
                                        </Text>
                                    )}
                                </View>
                                {file.is_dir && (
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                                )}
                            </Pressable>
                        ))
                    )}
                </ScrollView>

                {/* New Folder Modal */}
                <Modal
                    visible={showNewFolderModal}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setShowNewFolderModal(false)}
                >
                    <View className="flex-1 bg-black/50 items-center justify-center p-4">
                        <View className="bg-card rounded-xl p-4 w-full max-w-sm">
                            <Text variant="title3" className="font-bold mb-4">New Folder</Text>
                            <TextInput
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                placeholder="Folder name"
                                placeholderTextColor={colors.grey}
                                className="bg-background border border-border rounded-lg px-4 py-3 mb-4"
                                style={{ color: colors.foreground }}
                            />
                            <View className="flex-row gap-3">
                                <Button
                                    variant="secondary"
                                    onPress={() => {
                                        setShowNewFolderModal(false);
                                        setNewFolderName('');
                                    }}
                                    className="flex-1"
                                >
                                    <Text>Cancel</Text>
                                </Button>
                                <Button
                                    variant="primary"
                                    onPress={() => {
                                        // TODO: Implement create folder API call
                                        Alert.alert('Info', 'Create folder functionality coming soon');
                                        setShowNewFolderModal(false);
                                        setNewFolderName('');
                                    }}
                                    className="flex-1"
                                >
                                    <Text className="text-white">Create</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </>
    );
}
