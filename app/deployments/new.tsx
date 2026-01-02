import * as React from 'react';
import { View, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Pressable, Modal, FlatList } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { useColorScheme } from '@/lib/useColorScheme';
import { deploymentsApi, volumesApi } from '@/services/api';

interface VolumeOption {
    id: number;
    name: string;
    volume_name: string;
}

interface ServiceVolume {
    id: string;
    volumeId: number | null; // Selected volume ID
    mountPath: string;
}

interface ServiceEnv {
    id: string;
    key: string;
    value: string;
}

interface Service {
    id: string;
    name: string;
    image: string;
    volumes: ServiceVolume[];
    env: ServiceEnv[];
}

export default function NewDeploymentScreen() {
    const { colors } = useColorScheme();
    const params = useLocalSearchParams<{ mode?: string, id?: string, initialProjectName?: string, initialYaml?: string }>();
    const isEditMode = params.mode === 'edit';

    const [projectName, setProjectName] = React.useState(params.initialProjectName || '');
    const [isCreating, setIsCreating] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'gui' | 'yaml'>('gui');
    const [availableVolumes, setAvailableVolumes] = React.useState<VolumeOption[]>([]);

    // Modal State
    const [isVolumeModalVisible, setIsVolumeModalVisible] = React.useState(false);
    const [volumeSearchQuery, setVolumeSearchQuery] = React.useState('');
    const [currentVolumeSelection, setCurrentVolumeSelection] = React.useState<{ serviceId: string, volumeId: string } | null>(null);

    // GUI State
    const [services, setServices] = React.useState<Service[]>([
        { id: '1', name: 'app', image: '', volumes: [], env: [] }
    ]);

    // Raw YAML State (syncs from GUI on tab switch or submit)
    const [rawYaml, setRawYaml] = React.useState(params.initialYaml || '');

    React.useEffect(() => {
        loadVolumes();
        if (isEditMode && params.initialYaml) {
            setActiveTab('yaml'); // Default to YAML for edit since GUI might not match perfectly
        }
    }, []);

    const loadVolumes = async () => {
        try {
            const vols = await volumesApi.list();
            setAvailableVolumes(vols);
        } catch (e) {
            console.error(e);
        }
    };

    const generateYaml = () => {
        let yaml = `version: '3.8'\n\nservices:\n`;
        const externalVolumes = new Map<string, string>(); // friendly_name -> docker_name

        services.forEach(svc => {
            if (!svc.name) return;
            yaml += `  ${svc.name}:\n`;
            yaml += `    image: ${svc.image || 'nginx:latest'}\n`;
            yaml += `    restart: always\n`;

            // Environment
            if (svc.env.length > 0) {
                yaml += `    environment:\n`;
                svc.env.forEach(e => {
                    if (e.key) yaml += `      - ${e.key}=${e.value}\n`;
                });
            }

            // Volumes
            if (svc.volumes.length > 0) {
                yaml += `    volumes:\n`;
                svc.volumes.forEach(v => {
                    if (v.volumeId) {
                        const vol = availableVolumes.find(av => av.id === v.volumeId);
                        if (vol) {
                            // Use a sanitized name for the compose service volume
                            const friendlyVolName = vol.name.replace(/[^a-z0-9_]/gi, '_');
                            yaml += `      - ${friendlyVolName}:${v.mountPath || '/data'}\n`;
                            externalVolumes.set(friendlyVolName, vol.volume_name);
                        }
                    } else if (v.mountPath) {
                        // Bind mount or anonymous? Assuming user only picks existing for now as per request
                    }
                });
            }
            yaml += `\n`;
        });

        // Volume Definitions
        if (externalVolumes.size > 0) {
            yaml += `volumes:\n`;
            externalVolumes.forEach((dockerName, friendlyName) => {
                yaml += `  ${friendlyName}:\n`;
                yaml += `    external:\n      name: ${dockerName}\n`;
            });
        }

        return yaml;
    };

    const handleSubmit = async () => {
        if (!projectName.trim()) {
            Alert.alert('Error', 'Project Name is required');
            return;
        }

        // Generate YAML from state if in GUI mode
        const finalYaml = activeTab === 'gui' ? generateYaml() : rawYaml;

        if (!finalYaml.trim()) {
            Alert.alert('Error', 'Configuration is empty');
            return;
        }

        setIsCreating(true);
        try {
            if (isEditMode && params.id) {
                // Update endpoint takes object with fields to update
                await deploymentsApi.update(Number(params.id), {
                    project_name: projectName.trim(),
                    raw_yaml: finalYaml
                });
                Alert.alert('Success', 'Deployment updated');
            } else {
                await deploymentsApi.create(projectName.trim(), finalYaml);
            }
            router.back();
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Operation failed');
            setIsCreating(false);
        }
    };

    // --- Service Helpers ---
    const addService = () => {
        setServices([...services, {
            id: Date.now().toString(),
            name: '',
            image: '',
            volumes: [],
            env: []
        }]);
    };

    const removeService = (id: string) => {
        setServices(services.filter(s => s.id !== id));
    };

    const updateService = (id: string, field: keyof Service, value: any) => {
        setServices(services.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addEnv = (serviceId: string) => {
        const s = services.find(x => x.id === serviceId);
        if (s) {
            const newEnv = [...s.env, { id: Date.now().toString(), key: '', value: '' }];
            updateService(serviceId, 'env', newEnv);
        }
    };

    const removeEnv = (serviceId: string, envId: string) => {
        const s = services.find(x => x.id === serviceId);
        if (s) {
            updateService(serviceId, 'env', s.env.filter(e => e.id !== envId));
        }
    };

    const updateEnv = (serviceId: string, envId: string, field: 'key' | 'value', val: string) => {
        const s = services.find(x => x.id === serviceId);
        if (s) {
            const newEnv = s.env.map(e => e.id === envId ? { ...e, [field]: val } : e);
            updateService(serviceId, 'env', newEnv);
        }
    };

    const addVolume = (serviceId: string) => {
        const s = services.find(x => x.id === serviceId);
        if (s) {
            const newVols = [...s.volumes, { id: Date.now().toString(), volumeId: null, mountPath: '' }];
            updateService(serviceId, 'volumes', newVols);
        }
    };

    const removeVolume = (serviceId: string, volId: string) => {
        const s = services.find(x => x.id === serviceId);
        if (s) {
            updateService(serviceId, 'volumes', s.volumes.filter(v => v.id !== volId));
        }
    };

    const updateVolume = (serviceId: string, volId: string, field: 'volumeId' | 'mountPath', val: any) => {
        const s = services.find(x => x.id === serviceId);
        if (s) {
            const newVols = s.volumes.map(v => v.id === volId ? { ...v, [field]: val } : v);
            updateService(serviceId, 'volumes', newVols);
        }
    };

    // Modal Helpers
    const openVolumePicker = (serviceId: string, volId: string) => {
        setCurrentVolumeSelection({ serviceId, volumeId: volId });
        setVolumeSearchQuery('');
        setIsVolumeModalVisible(true);
    };

    const selectVolumeFromModal = (volumeId: number) => {
        if (currentVolumeSelection) {
            updateVolume(currentVolumeSelection.serviceId, currentVolumeSelection.volumeId, 'volumeId', volumeId);
            setIsVolumeModalVisible(false);
            setCurrentVolumeSelection(null);
        }
    };

    const filteredVolumes = React.useMemo(() => {
        if (!volumeSearchQuery) return availableVolumes;
        return availableVolumes.filter(v =>
            v.name.toLowerCase().includes(volumeSearchQuery.toLowerCase()) ||
            v.volume_name.toLowerCase().includes(volumeSearchQuery.toLowerCase())
        );
    }, [availableVolumes, volumeSearchQuery]);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <Stack.Screen options={{ title: isEditMode ? 'Edit Deployment' : 'New Deployment', headerBackTitle: 'Back' }} />

            <View className="flex-row items-center justify-center p-2 bg-card border-b border-border">
                <Pressable onPress={() => setActiveTab('gui')} className={`px-4 py-2 rounded-lg ${activeTab === 'gui' ? 'bg-primary/20' : ''}`}>
                    <Text className={activeTab === 'gui' ? 'text-primary font-bold' : 'text-muted-foreground'}>GUI Builder</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        setRawYaml(generateYaml());
                        setActiveTab('yaml');
                    }}
                    className={`px-4 py-2 rounded-lg ml-2 ${activeTab === 'yaml' ? 'bg-primary/20' : ''}`}
                >
                    <Text className={activeTab === 'yaml' ? 'text-primary font-bold' : 'text-muted-foreground'}>YAML Preview</Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <ScrollView contentContainerClassName="p-4 gap-4 pb-24" keyboardShouldPersistTaps="handled">
                    {/* Project Name */}
                    <View>
                        <Text variant="footnote" className="mb-2 text-muted-foreground">Project Name</Text>
                        <TextInput
                            value={projectName}
                            onChangeText={setProjectName}
                            placeholder="e.g., my-stack"
                            placeholderTextColor={colors.grey}
                            className="bg-card border border-border rounded-xl px-4 py-3 text-foreground font-semibold"
                            style={{ color: colors.foreground }}
                        />
                    </View>

                    {activeTab === 'gui' ? (
                        <View className="gap-6">
                            {services.map((svc, index) => (
                                <View key={svc.id} className="bg-card border border-border rounded-xl p-4 gap-4">
                                    <View className="flex-row justify-between items-center bg-zinc-100/10 -mx-4 -mt-4 px-4 py-3 border-b border-border mb-2 rounded-t-xl">
                                        <Text className="font-bold text-lg">Service #{index + 1}</Text>
                                        <Pressable onPress={() => removeService(svc.id)} className="bg-red-500/20 px-2 py-1 rounded">
                                            <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                                        </Pressable>
                                    </View>

                                    {/* Name & Image - Stacked Vertical */}
                                    <View className="gap-4">
                                        <View>
                                            <Text variant="caption1" className="mb-1 text-muted-foreground">Container Name</Text>
                                            <TextInput
                                                value={svc.name}
                                                onChangeText={v => updateService(svc.id, 'name', v)}
                                                placeholder="web"
                                                placeholderTextColor={colors.grey}
                                                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                                                style={{ color: colors.foreground }}
                                            />
                                        </View>
                                        <View>
                                            <Text variant="caption1" className="mb-1 text-muted-foreground">Image</Text>
                                            <TextInput
                                                value={svc.image}
                                                onChangeText={v => updateService(svc.id, 'image', v)}
                                                placeholder="nginx:latest"
                                                placeholderTextColor={colors.grey}
                                                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                                                style={{ color: colors.foreground }}
                                            />
                                        </View>
                                    </View>

                                    {/* Volumes */}
                                    <View>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <Text variant="caption1" className="font-semibold">Volumes</Text>
                                            <Pressable onPress={() => addVolume(svc.id)} className="flex-row items-center gap-1">
                                                <MaterialCommunityIcons name="plus-circle" size={16} color={colors.primary} />
                                                <Text className="text-primary text-xs">Add Volume</Text>
                                            </Pressable>
                                        </View>
                                        {svc.volumes.map(vol => (
                                            <View key={vol.id} className="flex-row gap-2 mb-2 items-center">
                                                <Pressable
                                                    onPress={() => openVolumePicker(svc.id, vol.id)}
                                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 justify-center"
                                                >
                                                    <Text className="text-xs" numberOfLines={1}>
                                                        {availableVolumes.find(av => av.id === vol.volumeId)?.name || 'Select Volume...'}
                                                    </Text>
                                                </Pressable>

                                                <TextInput
                                                    value={vol.mountPath}
                                                    onChangeText={v => updateVolume(svc.id, vol.id, 'mountPath', v)}
                                                    placeholder="/container/path"
                                                    placeholderTextColor={colors.grey}
                                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                                                    style={{ color: colors.foreground }}
                                                />
                                                <Pressable onPress={() => removeVolume(svc.id, vol.id)}>
                                                    <MaterialCommunityIcons name="close" size={16} color={colors.grey} />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Environment */}
                                    <View>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <Text variant="caption1" className="font-semibold">Environment Variables</Text>
                                            <Pressable onPress={() => addEnv(svc.id)} className="flex-row items-center gap-1">
                                                <MaterialCommunityIcons name="plus-circle" size={16} color={colors.primary} />
                                                <Text className="text-primary text-xs">Add Env</Text>
                                            </Pressable>
                                        </View>
                                        {svc.env.map(e => (
                                            <View key={e.id} className="flex-row gap-2 mb-2 items-center">
                                                <TextInput
                                                    value={e.key}
                                                    onChangeText={v => updateEnv(svc.id, e.id, 'key', v)}
                                                    placeholder="KEY"
                                                    placeholderTextColor={colors.grey}
                                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-xs"
                                                    style={{ color: colors.foreground }}
                                                />
                                                <Text className="text-muted-foreground">=</Text>
                                                <TextInput
                                                    value={e.value}
                                                    onChangeText={v => updateEnv(svc.id, e.id, 'value', v)}
                                                    placeholder="VALUE"
                                                    placeholderTextColor={colors.grey}
                                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground font-mono text-xs"
                                                    style={{ color: colors.foreground }}
                                                />
                                                <Pressable onPress={() => removeEnv(svc.id, e.id)}>
                                                    <MaterialCommunityIcons name="close" size={16} color={colors.grey} />
                                                </Pressable>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}

                            <Button variant="secondary" onPress={addService} className="mt-2">
                                <MaterialCommunityIcons name="plus" size={18} color="white" className="mr-2" />
                                <Text>Add Service</Text>
                            </Button>
                        </View>
                    ) : (
                        <View className="flex-1">
                            <TextInput
                                value={rawYaml}
                                onChangeText={setRawYaml}
                                multiline
                                textAlignVertical="top"
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="bg-card border border-border rounded-xl px-4 py-3 text-foreground font-mono text-sm leading-5 flex-1 min-h-[400px]"
                                style={{ color: colors.foreground, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
                            />
                        </View>
                    )}
                </ScrollView>

                <View className="p-4 border-t border-border bg-background safe-area-bottom">
                    <Button
                        onPress={handleSubmit}
                        disabled={isCreating}
                        size="lg"
                    >
                        {isCreating ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text className="text-white font-semibold">
                                {isEditMode ? 'Update Deployment' : 'Deploy Stack'}
                            </Text>
                        )}
                    </Button>
                </View>
            </KeyboardAvoidingView>

            {/* Volume Selection Modal */}
            <Modal
                visible={isVolumeModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsVolumeModalVisible(false)}
            >
                <SafeAreaView className="flex-1 bg-background">
                    <View className="p-4 border-b border-border flex-row justify-between items-center">
                        <Text variant="title3" className="font-bold">Select Volume</Text>
                        <Pressable onPress={() => setIsVolumeModalVisible(false)}>
                            <Text className="text-primary font-semibold">Close</Text>
                        </Pressable>
                    </View>

                    <View className="p-4 border-b border-border">
                        <View className="flex-row items-center bg-card rounded-lg px-3 py-2 border border-border">
                            <MaterialCommunityIcons name="magnify" size={20} color={colors.grey} />
                            <TextInput
                                value={volumeSearchQuery}
                                onChangeText={setVolumeSearchQuery}
                                placeholder="Search volumes..."
                                placeholderTextColor={colors.grey}
                                className="flex-1 ml-2 text-foreground"
                                style={{ color: colors.foreground }}
                                autoCorrect={false}
                            />
                            {volumeSearchQuery.length > 0 && (
                                <Pressable onPress={() => setVolumeSearchQuery('')}>
                                    <MaterialCommunityIcons name="close-circle" size={16} color={colors.grey} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={filteredVolumes}
                        keyExtractor={item => item.id.toString()}
                        contentContainerClassName="p-4"
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => selectVolumeFromModal(item.id)}
                                className="p-4 flex-row items-center justify-between border-b border-border active:bg-zinc-100 dark:active:bg-zinc-800"
                            >
                                <View>
                                    <Text className="font-semibold text-base">{item.name}</Text>
                                    <Text variant="caption1" className="text-muted-foreground mt-1">{item.volume_name}</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.grey} />
                            </Pressable>
                        )}
                        ListEmptyComponent={() => (
                            <View className="items-center py-12">
                                <Text className="text-muted-foreground">No volumes found</Text>
                            </View>
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
