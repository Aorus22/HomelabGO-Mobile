import React from 'react';
import { View, FlatList, RefreshControl, Alert, Switch, Modal, TextInput, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface FirewallRule {
    index: string;
    to: string;
    action: string;
    from: string;
}

export default function FirewallScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [status, setStatus] = React.useState('inactive');
    const [rules, setRules] = React.useState<FirewallRule[]>([]);

    // Add Rule Modal
    const [isModalVisible, setIsModalVisible] = React.useState(false);
    const [newPort, setNewPort] = React.useState('');
    const [newProto, setNewProto] = React.useState('tcp');
    const [newAction, setNewAction] = React.useState('allow');
    const [isSaving, setIsSaving] = React.useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true); // Always show loading on refresh
            const res = await adminApi.getFirewall();
            setStatus(res.status);
            setRules(res.rules || []);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load firewall status');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleToggle = async (value: boolean) => {
        try {
            setIsLoading(true);
            Alert.alert(
                'Confirm',
                `Are you sure you want to ${value ? 'ENABLE' : 'DISABLE'} the firewall?`,
                [
                    { text: 'Cancel', onPress: () => setIsLoading(false), style: 'cancel' },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            await adminApi.toggleFirewall(value);
                            await fetchData();
                        }
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message);
            setIsLoading(false);
        }
    };

    const handleDelete = (index: string) => {
        Alert.alert(
            'Delete Rule',
            `Delete rule #${index}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminApi.deleteFirewallRule(index);
                            fetchData();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleAddRule = async () => {
        if (!newPort) {
            Alert.alert('Error', 'Port is required');
            return;
        }
        try {
            setIsSaving(true);
            await adminApi.addFirewallRule(newPort, newProto, newAction);
            setIsModalVisible(false);
            setNewPort('');
            fetchData();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const renderItem = ({ item }: { item: FirewallRule }) => (
        <View className="bg-card border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between">
            <View>
                <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 bg-muted/20 rounded-full items-center justify-center">
                        <Text className="text-muted-foreground text-xs font-bold">{item.index}</Text>
                    </View>
                    <Text className="font-bold text-lg">{item.to}</Text>
                </View>
                <Text className="text-muted-foreground text-sm mt-1">From: {item.from}</Text>
            </View>
            <View className="items-end gap-2">
                <View className={`px-2 py-0.5 rounded ${item.action.includes('ALLOW') ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <Text className={`text-xs font-bold ${item.action.includes('ALLOW') ? 'text-green-500' : 'text-red-500'}`}>
                        {item.action}
                    </Text>
                </View>
                <Pressable onPress={() => handleDelete(item.index)}>
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.destructive} />
                </Pressable>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{ title: 'Firewall Manager' }} />

            <View className="p-4 bg-card border-b border-border flex-row justify-between items-center">
                <View>
                    <Text className="font-bold text-lg">UFW Status</Text>
                    <Text className={status === 'active' ? 'text-green-500' : 'text-red-500'}>
                        {status.toUpperCase()}
                    </Text>
                </View>
                <Switch
                    value={status === 'active'}
                    onValueChange={handleToggle}
                    disabled={isLoading}
                />
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    contentContainerClassName="p-4 pb-24"
                    data={rules}
                    keyExtractor={(item) => item.index + item.to}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text color="tertiary">No rules found</Text>
                        </View>
                    }
                />
            )}

            <View className="absolute bottom-6 right-6">
                <Button
                    size="icon"
                    className="rounded-full w-14 h-14 bg-primary shadow-lg"
                    onPress={() => setIsModalVisible(true)}
                >
                    <MaterialCommunityIcons name="plus" size={28} color="white" />
                </Button>
            </View>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-card rounded-t-3xl p-6">
                        <Text variant="title2" className="font-bold mb-4">Add Firewall Rule</Text>

                        <View className="gap-4">
                            <TextInput
                                placeholder="Port (e.g. 8080 or ssh)"
                                value={newPort}
                                onChangeText={setNewPort}
                                className="bg-background border border-border p-3 rounded-xl"
                                placeholderTextColor={colors.grey}
                                style={{ color: colors.foreground }}
                            />

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="mb-2 font-medium">Protocol</Text>
                                    <View className="flex-row bg-background rounded-xl border border-border overflow-hidden">
                                        {['tcp', 'udp', 'any'].map(p => (
                                            <Pressable
                                                key={p}
                                                className={`flex-1 p-2 items-center ${newProto === p ? 'bg-primary' : ''}`}
                                                onPress={() => setNewProto(p)}
                                            >
                                                <Text className={newProto === p ? 'text-white' : 'text-foreground'}>{p.toUpperCase()}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <Text className="mb-2 font-medium">Action</Text>
                                    <View className="flex-row bg-background rounded-xl border border-border overflow-hidden">
                                        {['allow', 'deny'].map(a => (
                                            <Pressable
                                                key={a}
                                                className={`flex-1 p-2 items-center ${newAction === a ? (a === 'allow' ? 'bg-green-500' : 'bg-red-500') : ''}`}
                                                onPress={() => setNewAction(a)}
                                            >
                                                <Text className={newAction === a ? 'text-white' : 'text-foreground'}>{a.toUpperCase()}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            <Button onPress={handleAddRule} disabled={isSaving}>
                                {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold">Add Rule</Text>}
                            </Button>
                            <Button variant="secondary" onPress={() => setIsModalVisible(false)}>
                                <Text>Cancel</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
