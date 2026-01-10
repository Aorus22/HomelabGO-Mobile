import React from 'react';
import { View, FlatList, RefreshControl, Alert, Modal, TextInput, Platform } from 'react-native';
import { Stack } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { adminApi } from '@/services/api';

interface CronJob {
    id: string;
    schedule: string;
    command: string;
    raw: string;
}

export default function CronManagerScreen() {
    const { colors } = useColorScheme();
    const [isLoading, setIsLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [jobs, setJobs] = React.useState<CronJob[]>([]);

    // Modal State
    const [modalVisible, setModalVisible] = React.useState(false);
    const [editingJob, setEditingJob] = React.useState<CronJob | null>(null);
    const [schedule, setSchedule] = React.useState('');
    const [command, setCommand] = React.useState('');

    const fetchData = async () => {
        try {
            const res = await adminApi.getCron();
            console.log('[CronManager] Jobs:', JSON.stringify(res, null, 2));
            setJobs(res || []);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to load crontab');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleSaveList = async (newJobs: CronJob[]) => {
        setSaving(true);
        try {
            // Map to struct expected by backend (schedule + command)
            const payload = newJobs.map(j => ({ schedule: j.schedule, command: j.command }));
            await adminApi.saveCron(payload);
            setJobs(newJobs);
            setModalVisible(false);
            setEditingJob(null);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to save crontab');
        } finally {
            setSaving(false);
        }
    };

    const onAdd = () => {
        setEditingJob(null);
        setSchedule('* * * * *');
        setCommand('');
        setModalVisible(true);
    };

    const onEdit = (job: CronJob) => {
        setEditingJob(job);
        setSchedule(job.schedule);
        setCommand(job.command);
        setModalVisible(true);
    };

    const onDelete = (jobId: string) => {
        Alert.alert('Delete Job', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                    const newJobs = jobs.filter(j => j.id !== jobId);
                    handleSaveList(newJobs);
                }
            }
        ]);
    };

    const submitModal = () => {
        if (!schedule.trim() || !command.trim()) {
            Alert.alert('Error', 'Schedule and Command are required');
            return;
        }

        let newJobs = [...jobs];
        if (editingJob) {
            newJobs = newJobs.map(j =>
                j.id === editingJob.id
                    ? { ...j, schedule, command }
                    : j
            );
        } else {
            const newId = `new-${Date.now()}`;
            newJobs.push({ id: newId, schedule, command, raw: '' });
        }
        handleSaveList(newJobs);
    };

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{
                title: 'Cron Manager',
                headerRight: () => (
                    <Button size="sm" variant="primary" onPress={onAdd}>
                        <MaterialCommunityIcons name="plus" size={20} color="white" />
                    </Button>
                )
            }} />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    contentContainerClassName="p-4 pb-20"
                    data={jobs}
                    keyExtractor={(item, index) => item.id || `job-${index}`}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text color="tertiary">No cron jobs found</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View className="bg-card border border-border rounded-xl p-4 mb-3 flex-row items-center gap-3">
                            <View className="bg-muted px-2 py-1 rounded w-24 items-center justify-center">
                                <Text className="font-mono text-xs font-bold text-center">{item.schedule}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="font-mono text-sm" numberOfLines={2}>{item.command}</Text>
                            </View>
                            <View className="flex-row gap-1">
                                <Button variant="secondary" size="sm" onPress={() => onEdit(item)} className="px-2">
                                    <MaterialCommunityIcons name="pencil" size={16} color={colors.foreground} />
                                </Button>
                                <Button variant="primary" className="bg-red-500 px-2" size="sm" onPress={() => onDelete(item.id)}>
                                    <MaterialCommunityIcons name="delete" size={16} color="white" />
                                </Button>
                            </View>
                        </View>
                    )}
                />
            )}

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-card rounded-t-3xl p-6 gap-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text variant="title3" className="font-bold">{editingJob ? 'Edit Job' : 'New Job'}</Text>
                            <Button variant="plain" onPress={() => setModalVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.grey} />
                            </Button>
                        </View>

                        <View>
                            <Text className="mb-1 font-semibold">Schedule</Text>
                            <TextInput
                                value={schedule}
                                onChangeText={setSchedule}
                                className="bg-background p-3 rounded-lg border border-border font-mono"
                                style={{ color: colors.foreground }}
                                placeholder="* * * * *"
                                placeholderTextColor={colors.grey}
                            />
                            <Text variant="caption2" color="tertiary" className="mt-1">
                                Format: min hour day month day-of-week (or @reboot)
                            </Text>
                        </View>

                        <View>
                            <Text className="mb-1 font-semibold">Command</Text>
                            <TextInput
                                value={command}
                                onChangeText={setCommand}
                                className="bg-background p-3 rounded-lg border border-border font-mono"
                                style={{ color: colors.foreground }}
                                placeholder="/path/to/script.sh"
                                placeholderTextColor={colors.grey}
                            />
                        </View>

                        <Button
                            variant="primary"
                            size="lg"
                            onPress={submitModal}
                            disabled={saving}
                            className="mt-4"
                        >
                            {saving ? <ActivityIndicator color="white" /> : <Text className="text-white">Save Job</Text>}
                        </Button>
                        <View className="h-4" />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
