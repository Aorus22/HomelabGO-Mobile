// User types
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Volume types
export interface Volume {
  id: number;
  name: string;
  volume_name: string;
  mount_path: string;
  created_at: string;
}

// Deployment types
export interface Deployment {
  id: number;
  project_name: string;
  raw_yaml?: string;
  status: 'pending' | 'deploying' | 'running' | 'failed' | 'stopped';
  created_at: string;
  updated_at: string;
}

export interface DeployResult {
  message: string;
  status: string;
  containers: ContainerBasic[];
}

export interface ContainerBasic {
  id: string;
  name: string;
  service_name: string;
}

// Container types
export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: string;
  project_name: string;
  service_name: string;
}

// File types
export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
  extension?: string;
}

export interface FileContent {
  type: 'file' | 'directory';
  path: string;
  name?: string;
  size?: number;
  content?: string;
  files?: FileInfo[];
}

// System stats
export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  host_info: {
    hostname: string;
    uptime: number;
    platform: string;
    kernel_version: string;
    go_version: string;
    time: string;
  };
}

// Cloudflare types
export interface CloudflareConfig {
  configured: boolean;
  tunnel_token?: string;
}

export interface CloudflareStatus {
  container_id: string;
  status: string;
  state: string;
  running: boolean;
}

// API Error
export interface ApiError {
  error: string;
}

// Validate response
export interface ValidateResponse {
  valid: boolean;
  error?: string;
  services?: string[];
}
