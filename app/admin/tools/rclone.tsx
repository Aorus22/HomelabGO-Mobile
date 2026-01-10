import React from 'react';
import { View, FlatList, RefreshControl, Alert, Modal, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

// Predefined schemas for common providers
const PROVIDERS = [
    {
        label: 'Google Drive',
        value: 'drive',
        description: 'Requires OAuth token. Run "rclone authorize drive" on your PC to generate one.',
        fields: [
            { key: 'client_id', label: 'Client ID (Optional, recommended for performance)' },
            { key: 'client_secret', label: 'Client Secret (Optional)' },
            { key: 'token', label: 'Access Token (JSON blob from rclone authorize)', multiline: true, placeholder: '{"access_token":"..."}' }
        ]
    },
    {
        label: 'S3 / Minio',
        value: 's3',
        description: 'Compatible with AWS, Minio, DigitalOcean Spaces, etc.',
        fields: [
            { key: 'provider', label: 'Provider (AWS, Minio, etc)', default: 'AWS' },
            { key: 'access_key_id', label: 'Access Key' },
            { key: 'secret_access_key', label: 'Secret Key' },
            { key: 'region', label: 'Region (e.g. us-east-1)' },
            { key: 'endpoint', label: 'Endpoint (Required for non-AWS)' }
        ]
    },
    {
        label: 'SMB / CIFS',
        value: 'smb',
        description: 'Windows Network Share',
        fields: [
            { key: 'host', label: 'Host / IP' },
            { key: 'user', label: 'Username' },
            { key: 'pass', label: 'Password' }
        ]
    },
    {
        label: 'SFTP (SSH)',
        value: 'sftp',
        description: 'Secure File Transfer over SSH',
        fields: [
            { key: 'host', label: 'Host / IP' },
            { key: 'user', label: 'Username' },
            { key: 'pass', label: 'Password' }
        ]
    },
    {
        label: 'Dropbox',
        value: 'dropbox',
        description: 'Requires OAuth token similar to Google Drive.',
        fields: [
            { key: 'client_id', label: 'Client ID' },
            { key: 'client_secret', label: 'Client Secret' },
            { key: 'token', label: 'Token (JSON from rclone authorize "dropbox")', multiline: true }
        ]
    },
    {
        label: 'Custom',
        value: 'custom',
        description: 'Manual configuration for other providers.',
        fields: []
    },
];

export default function RcloneScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [remotes, setRemotes] = React.useState<string[]>([]);
    const [isInstalled, setIsInstalled] = React.useState(true);
    const [isInstalling, setIsInstalling] = React.useState(false);

    // Add Remote Modal
    const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [selectedProvider, setSelectedProvider] = React.useState(PROVIDERS[0]);

    // Dynamic Form State
    const [formValues, setFormValues] = React.useState<Record<string, string>>({});

    // Custom Key-Values
    const [customKey, setCustomKey] = React.useState('');
    const [customVal, setCustomVal] = React.useState('');

    // Mount Modal
    const [isMountModalVisible, setIsMountModalVisible] = React.useState(false);
    const [selectedRemote, setSelectedRemote] = React.useState('');
    const [mountPath, setMountPath] = React.useState('/mnt/');

    // Sync Modal
    const [isSyncModalVisible, setIsSyncModalVisible] = React.useState(false);
    const [syncSource, setSyncSource] = React.useState('');
    const [syncDest, setSyncDest] = React.useState('');

    const fetchData = async () => {
        try {
            const status = await adminApi.getRcloneStatus();
            setIsInstalled(status.installed);
            if (status.installed) {
                const res = await adminApi.listRcloneRemotes();
                setRemotes(res || []);
            }
        } catch (error: any) {
            console.log(error); // Failure usually means backend offline or api error, but basic check passes
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            await adminApi.installRclone();
            Alert.alert('Success', 'Rclone installed successfully');
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Installation failed.');
        } finally {
            setIsInstalling(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleCreateRemote = async () => {
        if (!newName) return Alert.alert('Error', 'Name required');

        // Clean values
        const config: Record<string, string> = {};
        for (const [k, v] of Object.entries(formValues)) {
            if (v && v.trim() !== '') {
                config[k] = v.trim();
            }
        }

        try {
            await adminApi.createRcloneRemote(newName, selectedProvider.value, config);
            setIsAddModalVisible(false);
            setNewName('');
            setFormValues({});
            fetchData();
            Alert.alert('Success', 'Remote created successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleMount = async () => {
        if (!mountPath) return Alert.alert('Error', 'Path required');
        try {
            await adminApi.mountRcloneRemote(selectedRemote, mountPath);
            setIsMountModalVisible(false);
            Alert.alert('Success', `Mount service created for ${selectedRemote}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleSync = async () => {
        try {
            await adminApi.syncRclone(syncSource, syncDest);
            setIsSyncModalVisible(false);
            Alert.alert('Success', 'Sync started in background');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleDelete = (name: string) => {
        Alert.alert('Delete', `Delete remote ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await adminApi.deleteRcloneRemote(name);
                    fetchData();
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: string }) => (
        <View className="bg-card border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
                <MaterialCommunityIcons name="cloud" size={24} color={colors.primary} />
                <Text className="font-bold text-lg">{item}</Text>
            </View>
            <View className="flex-row gap-2">
                <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                        setSelectedRemote(item);
                        setIsMountModalVisible(true);
                    }}
                >
                    <Text>Mount</Text>
                </Button>
                <Pressable onPress={() => handleDelete(item)} className="p-2">
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.destructive} />
                </Pressable>
            </View>
        </View>
    );

    if (!isLoading && !isInstalled) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-8">
                <Stack.Screen options={{ title: 'Rclone Manager' }} />
                <MaterialCommunityIcons name="cloud-download-outline" size={64} color={colors.primary} />
                <Text variant="title2" className="font-bold my-4 text-center">Rclone Missing</Text>
                <Text className="text-center mb-6" color="tertiary">
                    Rclone is required to manage cloud storage. Would you like to install it?
                </Text>
                <Button onPress={handleInstall} disabled={isInstalling} className="w-full">
                    {isInstalling ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Install Rclone</Text>}
                </Button>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{
                title: 'Rclone Manager',
                headerRight: () => (
                    <Pressable onPress={() => setIsSyncModalVisible(true)}>
                        <MaterialCommunityIcons name="sync" size={24} color={colors.primary} />
                    </Pressable>
                )
            }} />

            <FlatList
                contentContainerClassName="p-4"
                data={remotes}
                keyExtractor={(item) => item}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                renderItem={renderItem}
                ListEmptyComponent={<Text className="p-8 text-center" color="tertiary">No remotes found</Text>}
            />

            <View className="absolute bottom-6 right-6">
                <Button
                    size="icon"
                    className="rounded-full w-14 h-14 bg-primary shadow-lg"
                    onPress={() => setIsAddModalVisible(true)}
                >
                    <MaterialCommunityIcons name="plus" size={28} color="white" />
                </Button>
            </View>

            {/* Add Remote Modal */}
            <Modal visible={isAddModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-card rounded-t-3xl p-6 h-[90%]">
                        <Text variant="title2" className="font-bold mb-4">Add Rclone Remote</Text>
                        <ScrollView className="gap-4" showsVerticalScrollIndicator={false}>
                            <TextInput
                                placeholder="Remote Name (e.g. mydrive)"
                                value={newName}
                                onChangeText={setNewName}
                                className="bg-background border border-border p-3 rounded-xl mb-4"
                                placeholderTextColor={colors.grey}
                                style={{ color: colors.foreground }}
                            />

                            <Text className="mb-2 font-medium">Provider</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-4">
                                {PROVIDERS.map(p => (
                                    <Pressable
                                        key={p.value}
                                        onPress={() => {
                                            setSelectedProvider(p);
                                            setFormValues({}); // Reset form
                                        }}
                                        className={`px-4 py-2 rounded-full border ${selectedProvider.value === p.value ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                                    >
                                        <Text className={selectedProvider.value === p.value ? 'text-white' : ''}>{p.label}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <View className="bg-muted/10 p-4 rounded-xl gap-4 mb-4">
                                <Text className="text-sm opacity-80 mb-2">{selectedProvider.description}</Text>
                                {selectedProvider.fields.map(field => (
                                    <View key={field.key}>
                                        <Text className="text-xs mb-1 opacity-70">{field.label}</Text>
                                        <TextInput
                                            value={formValues[field.key] || field.default || ''}
                                            onChangeText={(text) => setFormValues(prev => ({ ...prev, [field.key]: text }))}
                                            className={`bg-background border border-border p-3 rounded-xl ${field.multiline ? 'h-24' : ''}`}
                                            multiline={field.multiline}
                                            placeholder={field.placeholder}
                                            placeholderTextColor={colors.grey}
                                            style={{ color: colors.foreground, textAlignVertical: field.multiline ? 'top' : 'center' }}
                                        />
                                    </View>
                                ))}

                                {selectedProvider.value === 'custom' && (
                                    <View>
                                        {/* Custom Key Value logic preserved but simplified for brevity in this replace */}
                                        <Text>Use "Custom" to add manual keys.</Text>
                                        <View className="flex-row gap-2 mt-2">
                                            <TextInput placeholder="Key" value={customKey} onChangeText={setCustomKey} className="flex-1 bg-background p-2 rounded border border-border" />
                                            <TextInput placeholder="Value" value={customVal} onChangeText={setCustomVal} className="flex-1 bg-background p-2 rounded border border-border" />
                                            <Button size="sm" onPress={() => {
                                                if (customKey) setFormValues(p => ({ ...p, [customKey]: customVal }));
                                                setCustomKey(''); setCustomVal('');
                                            }}><Text>Add</Text></Button>
                                        </View>
                                        <View className="flex-row flex-wrap gap-2 mt-2">
                                            {Object.entries(formValues).map(([k, v]) => (
                                                <Text key={k} className="text-xs bg-muted px-2 py-1">{k}={v}</Text>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Button onPress={handleCreateRemote} className="mb-2">
                                <Text className="text-white font-bold">Create Remote</Text>
                            </Button>
                            <Button variant="secondary" onPress={() => setIsAddModalVisible(false)}>
                                <Text>Cancel</Text>
                            </Button>
                            <View className="h-10" />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Mount Modal */}
            <Modal visible={isMountModalVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-center p-4">
                    <View className="bg-card rounded-2xl p-6">
                        <Text variant="title3" className="font-bold mb-4">Mount {selectedRemote}</Text>
                        <TextInput
                            placeholder="Local Mount Path (e.g. /mnt/cloud)"
                            value={mountPath}
                            onChangeText={setMountPath}
                            className="bg-background border border-border p-3 rounded-xl mb-4"
                        />
                        <View className="flex-row gap-4 justify-end">
                            <Button variant="secondary" onPress={() => setIsMountModalVisible(false)}>
                                <Text>Cancel</Text>
                            </Button>
                            <Button onPress={handleMount}>
                                <Text className="text-white">Mount</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Sync Modal */}
            <Modal visible={isSyncModalVisible} transparent animationType="fade">
                <View className="flex-1 bg-black/50 justify-center p-4">
                    <View className="bg-card rounded-2xl p-6">
                        <Text variant="title3" className="font-bold mb-4">Rclone Sync</Text>
                        <TextInput
                            placeholder="Source"
                            value={syncSource}
                            onChangeText={setSyncSource}
                            className="bg-background border border-border p-3 rounded-xl mb-2"
                        />
                        <TextInput
                            placeholder="Dest"
                            value={syncDest}
                            onChangeText={setSyncDest}
                            className="bg-background border border-border p-3 rounded-xl mb-4"
                        />
                        <View className="flex-row gap-4 justify-end">
                            <Button variant="secondary" onPress={() => setIsSyncModalVisible(false)}>
                                <Text>Cancel</Text>
                            </Button>
                            <Button onPress={handleSync}>
                                <Text className="text-white">Start</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
