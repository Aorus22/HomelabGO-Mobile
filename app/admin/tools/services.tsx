import React from 'react';
import { View, SectionList, RefreshControl, Alert, Modal, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface ServiceItem {
    name: string;
    load_state: string;
    active_state: string;
    sub_state: string;
    description: string;
    path: string;
}

export default function ServicesScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [services, setServices] = React.useState<ServiceItem[]>([]);

    // Tab State: 'system' | 'managed'
    const [activeTab, setActiveTab] = React.useState<'system' | 'managed'>('managed');

    // Action Modal
    const [logModalVisible, setLogModalVisible] = React.useState(false);
    const [selectedService, setSelectedService] = React.useState<ServiceItem | null>(null);
    const [logs, setLogs] = React.useState('');
    const [loadingLogs, setLoadingLogs] = React.useState(false);

    // Create Modal
    const [createModalVisible, setCreateModalVisible] = React.useState(false);
    const [creating, setCreating] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [newDesc, setNewDesc] = React.useState('');
    const [newExec, setNewExec] = React.useState('');
    const [newDir, setNewDir] = React.useState('/root');
    const [newUser, setNewUser] = React.useState('root');

    const fetchData = async () => {
        try {
            const res = await adminApi.listServices();
            setServices(res || []);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load services');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (serviceName: string, action: string) => {
        try {
            await adminApi.serviceAction(serviceName, action);
            Alert.alert('Success', `Service ${action}ed successfully`);
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Action failed');
        }
    };

    const handleViewLogs = async (service: ServiceItem) => {
        setSelectedService(service);
        setLogModalVisible(true);
        setLoadingLogs(true);
        try {
            const res = await adminApi.getServiceLogs(service.name);
            setLogs(res.logs);
        } catch (error: any) {
            setLogs('Failed to fetch logs: ' + error.message);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleDelete = async (serviceName: string) => {
        Alert.alert('Delete Service', `Are you sure you want to delete ${serviceName}? This will remove the unit file.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await adminApi.deleteService(serviceName);
                        Alert.alert('Success', 'Service deleted');
                        fetchData();
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'Delete failed');
                    }
                }
            }
        ]);
    };

    const handleCreate = async () => {
        if (!newName || !newExec) {
            Alert.alert('Error', 'Name and ExecStart are required');
            return;
        }

        setCreating(true);
        try {
            await adminApi.createService({
                name: newName,
                description: newDesc,
                exec_start: newExec,
                directory: newDir,
                user: newUser,
                auto_start: true
            });
            setCreateModalVisible(false);
            setNewName('');
            setNewDesc('');
            setNewExec('');
            Alert.alert('Success', 'Service created and started');
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Creation failed');
        } finally {
            setCreating(false);
        }
    };

    const filteredServices = React.useMemo(() => {
        if (activeTab === 'managed') {
            return services.filter(s => s.path && s.path.startsWith('/etc/systemd/system/'));
        }
        return services;
    }, [services, activeTab]);

    const renderItem = ({ item }: { item: ServiceItem }) => (
        <View className="bg-card border border-border rounded-xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                    <Text className="font-bold text-lg">{item.name}</Text>
                    <Text className="text-muted-foreground text-xs" numberOfLines={1}>{item.description}</Text>
                    <Text className="text-muted-foreground text-[10px] mt-0.5">{item.path}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${item.active_state === 'active' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <Text className={`text-xs font-bold ${item.active_state === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                        {item.active_state.toUpperCase()}
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-border">
                <View className="flex-row gap-2">
                    {item.active_state === 'active' ? (
                        <Button size="sm" variant="secondary" onPress={() => handleAction(item.name, 'stop')} className="px-3">
                            <MaterialCommunityIcons name="stop" size={16} color={colors.destructive} />
                        </Button>
                    ) : (
                        <Button size="sm" variant="secondary" onPress={() => handleAction(item.name, 'start')} className="px-3">
                            <MaterialCommunityIcons name="play" size={16} color="green" />
                        </Button>
                    )}
                    <Button size="sm" variant="secondary" onPress={() => handleAction(item.name, 'restart')} className="px-3">
                        <MaterialCommunityIcons name="restart" size={16} color={colors.primary} />
                    </Button>
                    <Button size="sm" variant="secondary" onPress={() => handleViewLogs(item)} className="px-3">
                        <MaterialCommunityIcons name="file-document-outline" size={16} color={colors.foreground} />
                    </Button>
                </View>

                {activeTab === 'managed' && (
                    <Button size="sm" variant="plain" onPress={() => handleDelete(item.name)}>
                        <MaterialCommunityIcons name="delete" size={18} color={colors.destructive} />
                    </Button>
                )}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{
                title: 'System Services',
                headerRight: () => activeTab === 'managed' ? (
                    <Button size="sm" variant="primary" onPress={() => setCreateModalVisible(true)}>
                        <MaterialCommunityIcons name="plus" size={20} color="white" />
                    </Button>
                ) : null
            }} />

            {/* Tabs */}
            <View className="flex-row p-4 pb-2 gap-4">
                <TouchableOpacity onPress={() => setActiveTab('managed')} className="flex-1">
                    <View className={`pb-2 border-b-2 items-center ${activeTab === 'managed' ? 'border-primary' : 'border-transparent'}`}>
                        <Text className={activeTab === 'managed' ? 'font-bold text-primary' : 'text-muted-foreground'}>Managed</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('system')} className="flex-1">
                    <View className={`pb-2 border-b-2 items-center ${activeTab === 'system' ? 'border-primary' : 'border-transparent'}`}>
                        <Text className={activeTab === 'system' ? 'font-bold text-primary' : 'text-muted-foreground'}>System (All)</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <SectionList
                    sections={[{ title: 'Services', data: filteredServices }]}
                    contentContainerClassName="p-4"
                    keyExtractor={(item, index) => `${item.name}-${index}`}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text color="tertiary">No services found</Text>
                        </View>
                    }
                />
            )}

            {/* Logs Modal */}
            <Modal visible={logModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLogModalVisible(false)}>
                <View className="flex-1 bg-background">
                    <View className="flex-row justify-between items-center p-4 border-b border-border">
                        <Text variant="title3" className="font-bold">{selectedService?.name} Logs</Text>
                        <Button variant="plain" onPress={() => setLogModalVisible(false)}>
                            <Text className="text-primary font-semibold">Done</Text>
                        </Button>
                    </View>
                    <ScrollView className="flex-1 p-4 bg-black">
                        {loadingLogs ? (
                            <ActivityIndicator />
                        ) : (
                            <Text className="text-green-400 font-mono text-xs">{logs || 'No logs found.'}</Text>
                        )}
                    </ScrollView>
                </View>
            </Modal>

            {/* Create Modal */}
            <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-card rounded-t-3xl p-6 gap-4 h-[70%]">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text variant="title3" className="font-bold">New Service</Text>
                            <Button variant="plain" onPress={() => setCreateModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.grey} />
                            </Button>
                        </View>

                        <ScrollView className="flex-1">
                            <View className="gap-4">
                                <View>
                                    <Text className="mb-1 font-semibold">Service Name</Text>
                                    <TextInput
                                        value={newName} onChangeText={setNewName}
                                        placeholder="my-app"
                                        className="bg-background p-3 rounded-lg border border-border"
                                        style={{ color: colors.foreground }}
                                        placeholderTextColor={colors.grey}
                                        autoCapitalize="none"
                                    />
                                    <Text variant="caption2" color="tertiary" className="mt-1">.service will be appended automatically</Text>
                                </View>
                                <View>
                                    <Text className="mb-1 font-semibold">Description</Text>
                                    <TextInput
                                        value={newDesc} onChangeText={setNewDesc}
                                        placeholder="My Custom App"
                                        className="bg-background p-3 rounded-lg border border-border"
                                        style={{ color: colors.foreground }}
                                        placeholderTextColor={colors.grey}
                                    />
                                </View>
                                <View>
                                    <Text className="mb-1 font-semibold">ExecStart (Command)</Text>
                                    <TextInput
                                        value={newExec} onChangeText={setNewExec}
                                        placeholder="/usr/bin/python3 /path/to/app.py"
                                        className="bg-background p-3 rounded-lg border border-border"
                                        style={{ color: colors.foreground }}
                                        placeholderTextColor={colors.grey}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <View className="flex-row gap-4">
                                    <View className="flex-1">
                                        <Text className="mb-1 font-semibold">Working Directory</Text>
                                        <TextInput
                                            value={newDir} onChangeText={setNewDir}
                                            placeholder="/root"
                                            className="bg-background p-3 rounded-lg border border-border"
                                            style={{ color: colors.foreground }}
                                            placeholderTextColor={colors.grey}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="mb-1 font-semibold">User</Text>
                                        <TextInput
                                            value={newUser} onChangeText={setNewUser}
                                            placeholder="root"
                                            className="bg-background p-3 rounded-lg border border-border"
                                            style={{ color: colors.foreground }}
                                            placeholderTextColor={colors.grey}
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        <Button
                            variant="primary"
                            size="lg"
                            onPress={handleCreate}
                            disabled={creating}
                            className="mt-4 mb-4"
                        >
                            {creating ? <ActivityIndicator color="white" /> : <Text className="text-white">Create Service</Text>}
                        </Button>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
