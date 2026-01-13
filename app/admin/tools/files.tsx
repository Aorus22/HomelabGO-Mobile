import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, TextInput, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';

// Note: This file manager works with the backend's /admin/files endpoint
// which accesses the host filesystem for admin users.

interface FileItem {
    name: string;
    path: string;
    is_dir: boolean;
    size: number;
    mod_time: string;
    owner: string;
    group: string;
    perm: string;
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
    const [showNewFileModal, setShowNewFileModal] = React.useState(false);
    const [newFileName, setNewFileName] = React.useState('');
    const [clipboard, setClipboard] = React.useState<{ action: 'cut' | 'copy'; file: FileItem } | null>(null);
    const [actionTarget, setActionTarget] = React.useState<FileItem | null>(null);
    const [showActionModal, setShowActionModal] = React.useState(false);
    const [renameOpen, setRenameOpen] = React.useState(false);
    const [renameValue, setRenameValue] = React.useState('');
    const [permOpen, setPermOpen] = React.useState(false);
    const [permValue, setPermValue] = React.useState('');

    // Import directly to avoid circular deps
    const fetchFiles = async () => {
        try {
            const { adminApi } = await import('@/services/api');
            const data = await adminApi.listFiles(currentPath);
            setFiles(data.files || []);
            if (data.path) {
                setCurrentPath(data.path);
            }
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

    const isWindowsPath = (value: string) => /^[a-zA-Z]:/.test(value) || value.includes('\\');

    const joinPath = (base: string, name: string) => {
        if (isWindowsPath(base)) {
            const cleaned = base.replace(/[\\/]+$/, '');
            return `${cleaned}\\${name}`;
        }
        if (base === '/') return `/${name}`;
        return `${base.replace(/\/$/, '')}/${name}`;
    };

    const getParentPath = (value: string) => {
        if (isWindowsPath(value)) {
            const cleaned = value.replace(/[\\/]+$/, '');
            const parts = cleaned.split(/[\\/]/).filter(Boolean);
            if (parts.length <= 1) return `${parts[0]}\\`;
            return `${parts[0]}\\${parts.slice(1, -1).join('\\')}`;
        }
        const cleaned = value.replace(/\/+$/, '');
        const parts = cleaned.split('/').filter(Boolean);
        if (parts.length <= 1) return '/';
        return `/${parts.slice(0, -1).join('/')}`;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const { adminApi } = await import('@/services/api');
            await adminApi.createDirectory(joinPath(currentPath, newFolderName.trim()));
            setShowNewFolderModal(false);
            setNewFolderName('');
            fetchFiles();
        } catch (error) {
            Alert.alert('Error', 'Failed to create folder');
        }
    };

    const handleCreateFile = async () => {
        if (!newFileName.trim()) return;
        try {
            const { adminApi } = await import('@/services/api');
            await adminApi.createFile(joinPath(currentPath, newFileName.trim()), '');
            setShowNewFileModal(false);
            setNewFileName('');
            fetchFiles();
        } catch (error) {
            Alert.alert('Error', 'Failed to create file');
        }
    };

    const handleRename = async () => {
        if (!actionTarget || !renameValue.trim()) return;
        try {
            const { adminApi } = await import('@/services/api');
            const parent = getParentPath(actionTarget.path);
            await adminApi.renameFile(actionTarget.path, joinPath(parent, renameValue.trim()));
            setRenameOpen(false);
            setRenameValue('');
            setActionTarget(null);
            fetchFiles();
        } catch (error) {
            Alert.alert('Error', 'Failed to rename item');
        }
    };

    const handlePermission = async () => {
        if (!actionTarget || !permValue.trim()) return;
        try {
            const { adminApi } = await import('@/services/api');
            await adminApi.chmodFile(actionTarget.path, permValue.trim());
            setPermOpen(false);
            setPermValue('');
            setActionTarget(null);
            fetchFiles();
        } catch (error) {
            Alert.alert('Error', 'Failed to update permission');
        }
    };

    const handleDelete = async (file: FileItem) => {
        try {
            const { adminApi } = await import('@/services/api');
            await adminApi.deleteFile(file.path);
            fetchFiles();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete item');
        }
    };

    const handlePaste = async () => {
        if (!clipboard) return;
        try {
            const { adminApi } = await import('@/services/api');
            const destination = joinPath(currentPath, clipboard.file.name);
            if (clipboard.action === 'cut') {
                await adminApi.moveFile(clipboard.file.path, destination);
                setClipboard(null);
            } else {
                await adminApi.copyFile(clipboard.file.path, destination);
            }
            fetchFiles();
        } catch (error) {
            Alert.alert('Error', 'Failed to paste item');
        }
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
                    {clipboard ? (
                        <Pressable
                            onPress={handlePaste}
                            className="p-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                        >
                            <MaterialCommunityIcons name="content-paste" size={20} color={colors.primary} />
                        </Pressable>
                    ) : null}
                    <Pressable
                        onPress={() => setShowNewFileModal(true)}
                        className="p-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                    >
                        <MaterialCommunityIcons name="file-plus" size={20} color={colors.primary} />
                    </Pressable>
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
                            <View
                                key={file.path}
                                className="flex-row items-center gap-3 p-3 rounded-lg active:bg-zinc-100 dark:active:bg-zinc-800"
                            >
                                <Pressable
                                    onPress={() => handleFilePress(file)}
                                    className="flex-1 flex-row items-center gap-3"
                                >
                                    <MaterialCommunityIcons
                                        name={getFileIcon(file)}
                                        size={24}
                                        color={file.is_dir ? '#f59e0b' : colors.grey}
                                    />
                                    <View className="flex-1">
                                        <Text className="font-medium">{file.name}</Text>
                                        <Text variant="caption2" color="tertiary">
                                            {file.is_dir ? 'Folder' : formatSize(file.size)} - {file.owner || '-'}:{file.group || '-'} - {file.perm || '-'} - {new Date(file.mod_time).toLocaleString()}
                                        </Text>
                                    </View>
                                </Pressable>
                                {file.is_dir && (
                                    <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                                )}
                                <Pressable
                                    onPress={() => {
                                        setActionTarget(file);
                                        setShowActionModal(true);
                                    }}
                                    className="p-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.grey} />
                                </Pressable>
                            </View>
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
                                    onPress={handleCreateFolder}
                                    className="flex-1"
                                >
                                    <Text className="text-white">Create</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* New File Modal */}
                <Modal
                    visible={showNewFileModal}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setShowNewFileModal(false)}
                >
                    <View className="flex-1 bg-black/50 items-center justify-center p-4">
                        <View className="bg-card rounded-xl p-4 w-full max-w-sm">
                            <Text variant="title3" className="font-bold mb-4">New File</Text>
                            <TextInput
                                value={newFileName}
                                onChangeText={setNewFileName}
                                placeholder="File name"
                                placeholderTextColor={colors.grey}
                                className="bg-background border border-border rounded-lg px-4 py-3 mb-4"
                                style={{ color: colors.foreground }}
                            />
                            <View className="flex-row gap-3">
                                <Button
                                    variant="secondary"
                                    onPress={() => {
                                        setShowNewFileModal(false);
                                        setNewFileName('');
                                    }}
                                    className="flex-1"
                                >
                                    <Text>Cancel</Text>
                                </Button>
                                <Button
                                    variant="primary"
                                    onPress={handleCreateFile}
                                    className="flex-1"
                                >
                                    <Text className="text-white">Create</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Action Menu */}
                <Modal
                    visible={showActionModal}
                    animationType="fade"
                    transparent
                    onRequestClose={() => {
                        setShowActionModal(false);
                        setActionTarget(null);
                    }}
                >
                    <View className="flex-1 bg-black/50 items-center justify-center p-4">
                        <View className="bg-card rounded-xl p-4 w-full max-w-sm">
                            <Text variant="title3" className="font-bold mb-4">File Actions</Text>
                            <View className="gap-2">
                                <Pressable
                                    onPress={() => {
                                        if (!actionTarget) return;
                                        setRenameValue(actionTarget.name);
                                        setRenameOpen(true);
                                        setShowActionModal(false);
                                    }}
                                    className="px-3 py-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <Text>Rename</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        if (!actionTarget) return;
                                        setClipboard({ action: 'cut', file: actionTarget });
                                        setShowActionModal(false);
                                    }}
                                    className="px-3 py-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <Text>Cut</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        if (!actionTarget) return;
                                        setClipboard({ action: 'copy', file: actionTarget });
                                        setShowActionModal(false);
                                    }}
                                    className="px-3 py-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <Text>Copy</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        if (!actionTarget) return;
                                        setPermValue('');
                                        setPermOpen(true);
                                        setShowActionModal(false);
                                    }}
                                    className="px-3 py-2 rounded-lg active:bg-zinc-200 dark:active:bg-zinc-700"
                                >
                                    <Text>Edit Permission</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        if (!actionTarget) return;
                                        setShowActionModal(false);
                                        Alert.alert(
                                            'Delete',
                                            `Delete ${actionTarget.name}?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(actionTarget) },
                                            ]
                                        );
                                    }}
                                    className="px-3 py-2 rounded-lg active:bg-red-100 dark:active:bg-red-900/30"
                                >
                                    <Text className="text-red-500">Delete</Text>
                                </Pressable>
                            </View>
                            <Button
                                variant="secondary"
                                onPress={() => setShowActionModal(false)}
                                className="mt-4"
                            >
                                <Text>Close</Text>
                            </Button>
                        </View>
                    </View>
                </Modal>

                {/* Rename Modal */}
                <Modal
                    visible={renameOpen}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setRenameOpen(false)}
                >
                    <View className="flex-1 bg-black/50 items-center justify-center p-4">
                        <View className="bg-card rounded-xl p-4 w-full max-w-sm">
                            <Text variant="title3" className="font-bold mb-4">Rename</Text>
                            <TextInput
                                value={renameValue}
                                onChangeText={setRenameValue}
                                placeholder="New name"
                                placeholderTextColor={colors.grey}
                                className="bg-background border border-border rounded-lg px-4 py-3 mb-4"
                                style={{ color: colors.foreground }}
                            />
                            <View className="flex-row gap-3">
                                <Button
                                    variant="secondary"
                                    onPress={() => {
                                        setRenameOpen(false);
                                        setRenameValue('');
                                    }}
                                    className="flex-1"
                                >
                                    <Text>Cancel</Text>
                                </Button>
                                <Button
                                    variant="primary"
                                    onPress={handleRename}
                                    className="flex-1"
                                >
                                    <Text className="text-white">Save</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Permission Modal */}
                <Modal
                    visible={permOpen}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setPermOpen(false)}
                >
                    <View className="flex-1 bg-black/50 items-center justify-center p-4">
                        <View className="bg-card rounded-xl p-4 w-full max-w-sm">
                            <Text variant="title3" className="font-bold mb-4">Edit Permission</Text>
                            <TextInput
                                value={permValue}
                                onChangeText={setPermValue}
                                placeholder="e.g. 755"
                                placeholderTextColor={colors.grey}
                                className="bg-background border border-border rounded-lg px-4 py-3 mb-4"
                                style={{ color: colors.foreground }}
                            />
                            <View className="flex-row gap-3">
                                <Button
                                    variant="secondary"
                                    onPress={() => {
                                        setPermOpen(false);
                                        setPermValue('');
                                    }}
                                    className="flex-1"
                                >
                                    <Text>Cancel</Text>
                                </Button>
                                <Button
                                    variant="primary"
                                    onPress={handlePermission}
                                    className="flex-1"
                                >
                                    <Text className="text-white">Save</Text>
                                </Button>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </>
    );
}
