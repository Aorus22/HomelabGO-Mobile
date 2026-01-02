import * as React from 'react';
import { View, ScrollView, RefreshControl, Pressable, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { containerFilesApi } from '@/services/api';
import { useColorScheme } from '@/lib/useColorScheme';

export default function FileBrowserScreen() {
    const { id, path } = useLocalSearchParams<{ id: string; path?: string }>();
    const { colors } = useColorScheme();
    const [files, setFiles] = React.useState<any[]>([]);
    const [currentPath, setCurrentPath] = React.useState(path || '/');
    const [isLoading, setIsLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    // Mkdir Modal
    const [isMkdirVisible, setIsMkdirVisible] = React.useState(false);
    const [newDirName, setNewDirName] = React.useState('');

    // Create file Modal
    const [isCreateFileVisible, setIsCreateFileVisible] = React.useState(false);
    const [newFileName, setNewFileName] = React.useState('');

    const fetchFiles = async (dirPath: string) => {
        setIsLoading(true);
        try {
            const data = await containerFilesApi.list(id!, dirPath);
            // Sort: Dirs first, then files. Alphabetical.
            const sorted = (data || []).sort((a, b) => {
                if (a.is_dir === b.is_dir) {
                    return a.name.localeCompare(b.name);
                }
                return a.is_dir ? -1 : 1;
            });
            setFiles(sorted);
            setCurrentPath(dirPath);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to list files');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        if (id) {
            fetchFiles(currentPath);
        }
    }, [id, currentPath]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFiles(currentPath);
    };

    const handleNavigate = (item: any) => {
        if (item.is_dir) {
            const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
            router.push({
                pathname: '/containers/[id]/files',
                params: { id, path: newPath }
            });
        } else {
            // Edit file
            const filePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
            router.push({
                pathname: '/containers/[id]/files/edit',
                params: { id, path: filePath }
            });
        }
    };

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                multiple: false
            });

            if (result.canceled) return;

            const file = result.assets[0];
            await containerFilesApi.upload(id!, currentPath, file);
            Alert.alert('Success', 'File uploaded');
            fetchFiles(currentPath);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to upload file');
        }
    };

    const handleMkdir = async () => {
        if (!newDirName.trim()) return;
        try {
            const newPath = currentPath === '/' ? `/${newDirName}` : `${currentPath}/${newDirName}`;
            await containerFilesApi.mkdir(id!, newPath);
            setIsMkdirVisible(false);
            setNewDirName('');
            fetchFiles(currentPath);
        } catch (error) {
            Alert.alert('Error', 'Failed to create directory');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={[]}>
            <Stack.Screen
                options={{
                    title: 'Files',
                    headerBackTitle: 'Back',
                    headerRight: () => (
                        <View className="flex-row gap-2">
                            <Pressable onPress={() => setIsCreateFileVisible(true)} className="p-2">
                                <MaterialCommunityIcons name="file-plus" size={24} color={colors.foreground} />
                            </Pressable>
                            <Pressable onPress={() => setIsMkdirVisible(true)} className="p-2">
                                <MaterialCommunityIcons name="folder-plus" size={24} color={colors.foreground} />
                            </Pressable>
                            <Pressable onPress={handleUpload} className="p-2">
                                <MaterialCommunityIcons name="upload" size={24} color={colors.foreground} />
                            </Pressable>
                        </View>
                    )
                }}
            />

            <View className="px-4 py-2 bg-muted/20 border-b border-border">
                <Text className="font-mono text-sm" numberOfLines={1}>{currentPath}</Text>
            </View>

            {isLoading && !refreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {files.map((item, index) => (
                        <Pressable
                            key={index}
                            onPress={() => handleNavigate(item)}
                            className="flex-row items-center p-4 border-b border-border/50 active:bg-muted/50"
                        >
                            <MaterialCommunityIcons
                                name={item.is_symlink ? "folder-arrow-right" : (item.is_dir ? "folder" : "file")}
                                size={24}
                                color={item.is_dir ? "#fbbf24" : colors.foreground}
                                className="mr-4"
                            />
                            <View className="flex-1">
                                <View className="flex-row items-center">
                                    <Text className="font-medium">{item.name}</Text>
                                    {item.is_symlink && (
                                        <MaterialCommunityIcons name="link" size={14} color={colors.grey} className="ml-1" />
                                    )}
                                </View>
                                {!item.is_dir && (
                                    <Text variant="caption2" color="tertiary">
                                        {(item.size / 1024).toFixed(1)} KB
                                    </Text>
                                )}
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                        </Pressable>
                    ))}
                    {files.length === 0 && (
                        <View className="p-8 items-center">
                            <Text color="tertiary">Empty directory</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            <Modal
                visible={isMkdirVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsMkdirVisible(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-4">
                    <View className="bg-card w-full max-w-sm p-6 rounded-xl border border-border">
                        <Text variant="title3" className="mb-4 font-bold">New Folder</Text>
                        <TextInput
                            className="p-3 rounded-lg mb-4"
                            style={{ backgroundColor: colors.grey6, color: colors.foreground }}
                            placeholder="Folder Name"
                            placeholderTextColor={colors.grey}
                            value={newDirName}
                            onChangeText={setNewDirName}
                            autoFocus
                        />
                        <View className="flex-row justify-end gap-3">
                            <Button variant="secondary" onPress={() => setIsMkdirVisible(false)}>
                                <Text>Cancel</Text>
                            </Button>
                            <Button onPress={handleMkdir}>
                                <Text className="text-white">Create</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isCreateFileVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsCreateFileVisible(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-4">
                    <View className="bg-card w-full max-w-sm p-6 rounded-xl border border-border">
                        <Text variant="title3" className="mb-4 font-bold">New File</Text>
                        <TextInput
                            className="p-3 rounded-lg mb-4"
                            style={{ backgroundColor: colors.grey6, color: colors.foreground }}
                            placeholder="File Name"
                            placeholderTextColor={colors.grey}
                            value={newFileName}
                            onChangeText={setNewFileName}
                            autoFocus
                        />
                        <View className="flex-row justify-end gap-3">
                            <Button variant="secondary" onPress={() => setIsCreateFileVisible(false)}>
                                <Text>Cancel</Text>
                            </Button>
                            <Button onPress={async () => {
                                if (!newFileName.trim()) return;
                                try {
                                    const filePath = currentPath === '/' ? `/${newFileName}` : `${currentPath}/${newFileName}`;
                                    await containerFilesApi.saveContent(id!, filePath, '');
                                    setIsCreateFileVisible(false);
                                    setNewFileName('');
                                    fetchFiles(currentPath);
                                } catch (error) {
                                    Alert.alert('Error', 'Failed to create file');
                                }
                            }}>
                                <Text className="text-white">Create</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
