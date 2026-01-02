import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://dev.alyza.dev';

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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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
};

// System API
export const systemApi = {
    getStats: () => request<{
        cpu_percent: number;
        memory_percent: number;
        disk_percent: number;
        host_info: Record<string, unknown>;
    }>('/system/stats'),
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

    downloadUrl: (id: number) => `${API_BASE_URL}/volumes/${id}/download`,

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
        created_at: string;
        updated_at: string;
    }>(`/deployments/${id}`),

    create: (project_name: string, raw_yaml: string) =>
        request<{ id: number; project_name: string; status: string }>('/deployments', {
            method: 'POST',
            body: JSON.stringify({ project_name, raw_yaml }),
        }),

    update: (id: number, data: { project_name?: string; raw_yaml?: string }) =>
        request(`/deployments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        request<{ message: string }>(`/deployments/${id}`, { method: 'DELETE' }),

    validate: (raw_yaml: string) =>
        request<{ valid: boolean; error?: string; services?: string[] }>('/deployments/0/validate', {
            method: 'POST',
            body: JSON.stringify({ raw_yaml }),
        }),

    deploy: (id: number) =>
        request<{ message: string; status: string; containers: Array<{ id: string; name: string }> }>(
            `/deployments/${id}/deploy`,
            { method: 'POST' }
        ),
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

// WebSocket helper
export function createWebSocket(endpoint: string, token: string | null): WebSocket {
    const wsUrl = API_BASE_URL.replace('http', 'ws');
    const separator = endpoint.includes('?') ? '&' : '?';
    return new WebSocket(`${wsUrl}${endpoint}${separator}token=${token || ''}`);
}

export { API_BASE_URL };
