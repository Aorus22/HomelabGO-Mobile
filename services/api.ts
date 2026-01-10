import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SERVER_URL_KEY = 'server_url';
export let API_BASE_URL = 'https://dev.alyza.dev'; // Default fallback

const TOKEN_KEY = 'auth_token';

// Token storage abstraction
export const tokenStorage = {
    async get(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(TOKEN_KEY);
        }
        return SecureStore.getItemAsync(TOKEN_KEY);
    },

    async set(token: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
    },

    async remove(): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    },
};

// Server URL storage
export const serverStorage = {
    async get(): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(SERVER_URL_KEY);
        }
        return SecureStore.getItemAsync(SERVER_URL_KEY);
    },

    async set(url: string): Promise<void> {
        // Ensure no trailing slash
        const cleanUrl = url.replace(/\/$/, '');
        API_BASE_URL = cleanUrl; // Update in-memory
        if (Platform.OS === 'web') {
            localStorage.setItem(SERVER_URL_KEY, cleanUrl);
        } else {
            await SecureStore.setItemAsync(SERVER_URL_KEY, cleanUrl);
        }
    },

    async remove(): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(SERVER_URL_KEY);
        } else {
            await SecureStore.deleteItemAsync(SERVER_URL_KEY);
        }
    },
};

// Initialize API_BASE_URL from storage
serverStorage.get().then(url => {
    if (url) API_BASE_URL = url;
});

// API request helper
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await tokenStorage.get();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const finalUrl = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(finalUrl, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data as T;
}

// Auth API
export const authApi = {
    login: (username: string, password: string) =>
        request<{ token: string; user: { id: number; username: string; role: string } }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    register: (username: string, password: string) =>
        request<{ token: string; user: { id: number; username: string; role: string } }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    me: () =>
        request<{ id: number; username: string; role: string }>('/auth/me'),
};

// System API
export const systemApi = {
    getStats: () => request<{
        cpu_percent: number;
        memory_percent: number;
        disk_percent: number;
        host_info: Record<string, unknown>;
    }>('/system/stats'),

    validateServer: async (url: string) => {
        const cleanUrl = url.replace(/\/$/, '');
        try {
            const response = await fetch(`${cleanUrl}/health`);
            if (!response.ok) return false;
            const data = await response.json();
            return data.status === 'ok';
        } catch (e) {
            return false;
        }
    },
};

// Volumes API
export const volumesApi = {
    list: () => request<Array<{
        id: number;
        name: string;
        volume_name: string;
        mount_path: string;
        created_at: string;
    }>>('/volumes'),

    create: (name: string) =>
        request<{ id: number; name: string; mount_path: string }>('/volumes', {
            method: 'POST',
            body: JSON.stringify({ name }),
        }),

    delete: (id: number) =>
        request<{ message: string }>(`/volumes/${id}`, { method: 'DELETE' }),

    getDownloadUrl: async (id: number) => {
        const baseUrl = await serverStorage.get() || API_BASE_URL;
        return `${baseUrl}/volumes/${id}/download`;
    },

    upload: (name: string, file: any) => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/gzip',
        } as any);

        return request<{ id: number; name: string; mount_path: string }>('/volumes/upload', {
            method: 'POST',
            body: formData,
        });
    },
};

// Deployments API
export const deploymentsApi = {
    list: () => request<Array<{
        id: number;
        project_name: string;
        status: string;
        created_at: string;
        updated_at: string;
    }>>('/deployments'),

    get: (id: number) => request<{
        id: number;
        project_name: string;
        raw_yaml: string;
        status: string;
        env_files: Array<{ id: number; name: string }>;
        created_at: string;
        updated_at: string;
    }>(`/deployments/${id}`),

    create: (project_name: string, raw_yaml: string, env_file_ids?: number[]) =>
        request<{ id: number; project_name: string; status: string }>('/deployments', {
            method: 'POST',
            body: JSON.stringify({ project_name, raw_yaml, env_file_ids }),
        }),

    update: (id: number, data: { project_name?: string; raw_yaml?: string; env_file_ids?: number[] }) =>
        request(`/deployments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        request<{ message: string }>(`/deployments/${id}`, { method: 'DELETE' }),

    validate: (id: number, yaml: string) =>
        request<{ valid: boolean; error?: string; services?: string[] }>(`/deployments/${id}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_yaml: yaml }),
        }),

    deploy: (id: number) =>
        request<{ message: string; containers: any[] }>(`/deployments/${id}/deploy`, { method: 'POST' }),

    stop: (id: number) =>
        request<{ message: string }>(`/deployments/${id}/stop`, { method: 'POST' }),

    start: (id: number) =>
        request<{ message: string }>(`/deployments/${id}/start`, { method: 'POST' }),
};

// Containers API
export const containersApi = {
    list: () => request<Array<{
        id: string;
        name: string;
        image: string;
        status: string;
        state: string;
        project_name: string;
        service_name: string;
    }>>('/containers'),

    get: (id: string) => request(`/containers/${id}`),

    start: (id: string) =>
        request<{ message: string }>(`/containers/${id}/start`, { method: 'POST' }),

    stop: (id: string) =>
        request<{ message: string }>(`/containers/${id}/stop`, { method: 'POST' }),

    restart: (id: string) =>
        request<{ message: string }>(`/containers/${id}/restart`, { method: 'POST' }),

    recreate: (id: string) =>
        request<{ message: string }>(`/containers/${id}/recreate`, { method: 'POST' }),

    pull: (id: string) =>
        request<{ message: string }>(`/containers/${id}/pull`, { method: 'POST' }),

    logs: (id: string, tail = 100) =>
        request<{ logs: string }>(`/containers/${id}/logs?tail=${tail}`),

    stats: (id: string) =>
        request<{
            cpu_percent: number;
            memory_usage: number;
            memory_limit: number;
            memory_percent: number;
            network_rx: number;
            network_tx: number;
        }>(`/containers/${id}/stats`),

    mounts: (id: string) =>
        request<Array<{
            type: string;
            source: string;
            destination: string;
            mode: string;
            rw: boolean;
        }>>(`/containers/${id}/mounts`),
};

// Container Files API
export const containerFilesApi = {
    list: (id: string, path: string = '/') =>
        request<Array<{
            name: string;
            path: string;
            is_dir: boolean;
            is_symlink: boolean;
            size: number;
            mode: string;
            mod_time: string;
        }>>(`/containers/${id}/files?path=${encodeURIComponent(path)}`),

    getContent: (id: string, path: string) =>
        request<{ path: string; content: string }>(
            `/containers/${id}/files/content?path=${encodeURIComponent(path)}`
        ),

    saveContent: (id: string, path: string, content: string) =>
        request<{ status: string }>(`/containers/${id}/files?path=${encodeURIComponent(path)}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),

    mkdir: (id: string, path: string) =>
        request<{ status: string; path: string }>(`/containers/${id}/files/mkdir`, {
            method: 'POST',
            body: JSON.stringify({ path }),
        }),

    upload: (id: string, path: string, file: any) => {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
        } as any);

        return request<{ status: string; path: string }>(
            `/containers/${id}/files/upload?path=${encodeURIComponent(path)}`,
            {
                method: 'POST',
                body: formData,
            }
        );
    },

    delete: (id: string, path: string) =>
        request<{ status: string }>(`/containers/${id}/files?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
        }),

    rename: (id: string, oldPath: string, newPath: string) =>
        request<{ status: string; path: string }>(`/containers/${id}/files/rename`, {
            method: 'POST',
            body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
        }),

    copy: (id: string, source: string, destination: string) =>
        request<{ status: string; destination: string }>(`/containers/${id}/files/copy`, {
            method: 'POST',
            body: JSON.stringify({ source, destination }),
        }),

    move: (id: string, source: string, destination: string) =>
        request<{ status: string; destination: string }>(`/containers/${id}/files/move`, {
            method: 'POST',
            body: JSON.stringify({ source, destination }),
        }),
};

// Files API
export const filesApi = {
    list: () => request<Array<{
        name: string;
        path: string;
        is_dir: boolean;
        size: number;
    }>>('/files'),

    get: (path: string) => request<{
        type: 'file' | 'directory';
        path: string;
        content?: string;
        files?: Array<{ name: string; path: string; is_dir: boolean; size: number }>;
    }>(`/files${path}`),

    save: (path: string, content: string) =>
        request<{ message: string }>(`/files${path}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),

    delete: (path: string) =>
        request<{ message: string }>(`/files${path}`, { method: 'DELETE' }),
};

// Cloudflare API
export const cloudflareApi = {
    getConfig: () => request<{ configured: boolean; tunnel_token?: string }>('/cloudflare'),

    updateConfig: (tunnel_token: string) =>
        request<{ message: string }>('/cloudflare', {
            method: 'PUT',
            body: JSON.stringify({ tunnel_token }),
        }),

    getStatus: () => request<{
        container_id: string;
        status: string;
        state: string;
        running: boolean;
    }>('/cloudflare/status'),

    getLogs: (tail = 100) => request<{ logs: string }>(`/cloudflare/logs?tail=${tail}`),
};

// Env Files API
export const envFilesApi = {
    list: () => request<Array<{
        id: number;
        name: string;
        created_at: string;
        updated_at: string;
    }>>('/envfiles'),

    get: (id: number) => request<{
        id: number;
        name: string;
        content: string;
        created_at: string;
        updated_at: string;
    }>(`/envfiles/${id}`),

    create: (name: string, content: string) =>
        request<{ id: number; name: string; content: string }>('/envfiles', {
            method: 'POST',
            body: JSON.stringify({ name, content }),
        }),

    update: (id: number, data: { name?: string; content?: string }) =>
        request<{ id: number; name: string; content: string }>(`/envfiles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        request<{ message: string }>(`/envfiles/${id}`, { method: 'DELETE' }),
};

// Admin API
export const adminApi = {
    // Files
    listFiles: (path: string = '/') =>
        request<{
            path: string;
            files: Array<{
                name: string;
                path: string;
                is_dir: boolean;
                size: number;
                mod_time: string;
            }>;
        }>(`/admin/files?path=${encodeURIComponent(path)}`),

    getFile: (path: string) =>
        request<{
            path: string;
            content: string;
            size: number;
            mod_time: string;
        }>(`/admin/files/content?path=${encodeURIComponent(path)}`),

    saveFile: (path: string, content: string) =>
        request<{ message: string }>('/admin/files/content', {
            method: 'POST',
            body: JSON.stringify({ path, content }),
        }),

    // Docker
    listDockerContainers: () =>
        request<Array<{
            id: string;
            name: string;
            image: string;
            state: string;
            status: string;
            created: number;
            project_name: string;
            is_managed: boolean;
        }>>('/admin/docker/containers'),

    listDockerImages: () =>
        request<Array<{
            id: string;
            tags: string[];
            size: number;
            created: number;
            is_managed: boolean;
        }>>('/admin/docker/images'),

    listDockerNetworks: () =>
        request<Array<{
            id: string;
            name: string;
            driver: string;
            scope: string;
            created: string;
            is_managed: boolean;
            project_name: string;
        }>>('/admin/docker/networks'),

    listDockerVolumes: () =>
        request<Array<{
            name: string;
            driver: string;
            mountpoint: string;
            created: string;
            is_managed: boolean;
            project_name: string;
        }>>('/admin/docker/volumes'),

    // Users
    listUsers: () =>
        request<Array<{
            id: number;
            username: string;
            role: string;
            deployment_count: number;
            volume_count: number;
            env_file_count: number;
        }>>('/admin/users'),

    getUser: (id: number) =>
        request<{ id: number; username: string; role: string }>(`/admin/users/${id}`),

    getUserDeployments: (userId: number) =>
        request<Array<{
            id: number;
            project_name: string;
            status: string;
            container_count: number;
            created_at: string;
        }>>(`/admin/users/${userId}/deployments`),

    getUserVolumes: (userId: number) =>
        request<Array<{
            id: number;
            name: string;
            volume_name: string;
            created_at: string;
        }>>(`/admin/users/${userId}/volumes`),

    getUserEnvFiles: (userId: number) =>
        request<Array<{
            id: number;
            name: string;
            created_at: string;
            updated_at: string;
        }>>(`/admin/users/${userId}/envfiles`),

    getDeploymentContainers: (userId: number, deploymentId: number) =>
        request<Array<{
            id: string;
            name: string;
            image: string;
            status: string;
            state: string;
        }>>(`/admin/users/${userId}/deployments/${deploymentId}/containers`),

    // Containers
    listAllContainers: () =>
        request<Array<{
            id: string;
            name: string;
            image: string;
            status: string;
            state: string;
            owner_id: number;
            owner_name: string;
            project_name: string;
            service_name: string;
        }>>('/admin/containers'),

    // Tools
    runSpeedtest: () =>
        request<{
            download: number;
            upload: number;
            ping: number;
            server: string;
        }>('/admin/tools/speedtest', { method: 'POST' }),

    // Cloudflare
    listCloudflareInstances: () =>
        request<Array<{
            id: number;
            token: string;
            container_id: string;
            status: string;
        }>>('/admin/cloudflare'),

    createCloudflareInstance: (token: string) =>
        request<{ id: number; message: string }>('/admin/cloudflare', {
            method: 'POST',
            body: JSON.stringify({ token }),
        }),

    startCloudflareInstance: (id: number) =>
        request<{ message: string; container_id: string }>(`/admin/cloudflare/${id}/start`, {
            method: 'POST',
        }),

    stopCloudflareInstance: (id: number) =>
        request<{ message: string }>(`/admin/cloudflare/${id}/stop`, {
            method: 'POST',
        }),

    deleteCloudflareInstance: (id: number) =>
        request<{ message: string }>(`/admin/cloudflare/${id}`, {
            method: 'DELETE',
        }),

    // System
    getCron: () => request<Array<{
        id: string;
        schedule: string;
        command: string;
        raw: string;
    }>>('/admin/system/cron'),

    saveCron: (jobs: Array<{ schedule: string; command: string }>) =>
        request<{ status: string }>('/admin/system/cron', {
            method: 'POST',
            body: JSON.stringify(jobs),
        }),

    listServices: () =>
        request<Array<{
            name: string;
            load_state: string;
            active_state: string;
            sub_state: string;
            description: string;
            path: string;
        }>>('/admin/system/services'),

    createService: (config: {
        name: string;
        description: string;
        exec_start: string;
        directory: string;
        user: string;
        auto_start: boolean;
    }) =>
        request<{ status: string }>('/admin/system/services', {
            method: 'POST',
            body: JSON.stringify(config),
        }),

    deleteService: (id: string) =>
        request<{ status: string }>(`/admin/system/services/${id}`, {
            method: 'DELETE',
        }),

    serviceAction: (id: string, action: string) =>
        request<{ status: string }>(`/admin/system/services/${id}/action`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        }),

    getServiceLogs: (id: string) =>
        request<{ logs: string }>(`/admin/system/services/${id}/logs`),

    listPorts: () =>
        request<Array<{
            protocol: string;
            port: string;
            address: string;
            process: string;
            pid: string;
        }>>('/admin/system/ports'),

    listNetworks: () =>
        request<Array<{
            name: string;
            mac: string;
            ips: string[];
            flags: string;
            mtu: number;
        }>>('/admin/system/networks'),

    listProcesses: () =>
        request<Array<{
            pid: string;
            user: string;
            cpu: string;
            memory: string;
            command: string;
        }>>('/admin/system/processes'),

    killProcess: (pid: string) =>
        request(`/admin/system/processes/${pid}`, {
            method: 'DELETE',
        }),

    getFirewall: () =>
        request<{
            status: string; // active, inactive
            rules: Array<{
                index: string;
                to: string;
                action: string;
                from: string;
            }>;
        }>('/admin/system/firewall'),

    toggleFirewall: (enable: boolean) =>
        request('/admin/system/firewall/toggle', {
            method: 'POST',
            body: JSON.stringify({ enable }),
        }),

    addFirewallRule: (port: string, proto: string, action: string) =>
        request('/admin/system/firewall/rules', {
            method: 'POST',
            body: JSON.stringify({ port, proto, action }),
        }),

    deleteFirewallRule: (index: string) =>
        request(`/admin/system/firewall/rules/${index}`, {
            method: 'DELETE',
        }),
};

// WebSocket helper
export async function createWebSocket(endpoint: string, token: string | null): Promise<WebSocket> {
    const baseUrl = await serverStorage.get() || API_BASE_URL;
    const wsUrl = baseUrl.replace('http', 'ws');
    const separator = endpoint.includes('?') ? '&' : '?';
    return new WebSocket(`${wsUrl}${endpoint}${separator}token=${token || ''}`);
}


