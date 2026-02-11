import { invoke } from '@tauri-apps/api/core';

export interface SystemResources {
  cpu_percent: number;
  memory_percent: number;
  memory_available_gb: number;
  memory_total_gb: number;
  disk_available_gb: number;
  disk_total_gb: number;
}

export interface HealthResponse {
  status: string;
  service?: string;
  timestamp?: string;
  database?: string;
}

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'checking';
  message?: string;
  timestamp?: string;
}

// Better Tauri detection using multiple checks
export const isTauriEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for __TAURI__ global
  if ('__TAURI__' in window) return true;
  
  // Check for __TAURI_INTERNALS__
  if ('__TAURI_INTERNALS__' in window) return true;
  
  // Check if we're in an iframe (usually not Tauri)
  if (window.self !== window.top) return false;
  
  // Check for tauri:// protocol
  if (window.location.protocol === 'tauri:') return true;
  
  return false;
};

// Tauri command wrappers with proper typing and error handling
export const tauriCommands = {
  checkComputeEngineHealth: async (): Promise<HealthResponse> => {
    try {
      const result = await invoke<HealthResponse>('check_compute_engine_health');
      return result;
    } catch (error) {
      throw new Error(error as string);
    }
  },

  checkBackendHealth: async (): Promise<HealthResponse> => {
    try {
      const result = await invoke<HealthResponse>('check_backend_health');
      return result;
    } catch (error) {
      throw new Error(error as string);
    }
  },

  getSystemResources: async (): Promise<SystemResources> => {
    try {
      const result = await invoke<SystemResources>('get_system_resources');
      return result;
    } catch (error) {
      throw new Error(error as string);
    }
  },

  callComputeEngine: async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    data?: any
  ): Promise<any> => {
    try {
      const result = await invoke('call_compute_engine', {
        endpoint,
        method,
        data: data || null,
      });
      return result;
    } catch (error) {
      throw new Error(error as string);
    }
  },

  healthCheck: async (): Promise<string> => {
    try {
      const result = await invoke<string>('health_check');
      return result;
    } catch (error) {
      throw new Error(error as string);
    }
  },

  // Utility function - synchronous check
  isTauriAvailable: (): boolean => {
    return isTauriEnvironment();
  },
};

// Export for use in components
export const isTauri = isTauriEnvironment();