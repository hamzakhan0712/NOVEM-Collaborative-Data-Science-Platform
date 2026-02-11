import axios from 'axios';

const COMPUTE_ENGINE_URL = 'http://127.0.0.1:8001';
const GRACE_PERIOD_DAYS = 7;

// Detect if running in Tauri
export const isTauriApp = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;
};

// Check if compute engine is available
export const isComputeEngineAvailable = async (): Promise<boolean> => {
  if (!isTauriApp()) return false;
  
  try {
    const response = await axios.get(`${COMPUTE_ENGINE_URL}/health`, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    console.warn('⚠ Compute engine not available');
    return false;
  }
};

// Storage abstraction layer
class StorageManager {
  private useComputeEngine: boolean = false;

  async init() {
    this.useComputeEngine = await isComputeEngineAvailable();
    console.log(`📦 Storage Mode: ${this.useComputeEngine ? 'Compute Engine SQLite' : 'localStorage'}`);
  }

  // Session Management
  async storeSession(sessionData: {
    user_id: string;
    email: string;
    username: string;
    access_token: string;
    refresh_token: string;
    account_state: string;
  }) {
    if (this.useComputeEngine) {
      try {
        const response = await axios.post(`${COMPUTE_ENGINE_URL}/auth/session/store`, sessionData);
        return response.data;
      } catch (error) {
        console.error('Failed to store session in compute engine:', error);
        // Fallback to localStorage
        localStorage.setItem('access_token', sessionData.access_token);
        localStorage.setItem('refresh_token', sessionData.refresh_token);
        localStorage.setItem('user_cache', JSON.stringify({
          id: sessionData.user_id,
          email: sessionData.email,
          username: sessionData.username,
          account_state: sessionData.account_state
        }));
      }
    } else {
      localStorage.setItem('access_token', sessionData.access_token);
      localStorage.setItem('refresh_token', sessionData.refresh_token);
      localStorage.setItem('user_cache', JSON.stringify({
        id: sessionData.user_id,
        email: sessionData.email,
        username: sessionData.username,
        account_state: sessionData.account_state
      }));
    }
  }

  async getCurrentSession() {
    if (this.useComputeEngine) {
      try {
        const response = await axios.get(`${COMPUTE_ENGINE_URL}/auth/session/current`);
        return response.data;
      } catch (error) {
        console.error('Failed to get session from compute engine:', error);
        return this.getLocalStorageSession();
      }
    } else {
      return this.getLocalStorageSession();
    }
  }

  private getLocalStorageSession() {
    const access_token = localStorage.getItem('access_token');
    const user_cache = localStorage.getItem('user_cache');
    
    if (!access_token || !user_cache) {
      return { session_active: false, offline_mode: false };
    }

    try {
      const user = JSON.parse(user_cache);
      return {
        session_active: true,
        user_id: user.id,
        email: user.email,
        offline_mode: false
      };
    } catch (error) {
      return { session_active: false, offline_mode: false };
    }
  }

  async clearSession() {
    if (this.useComputeEngine) {
      try {
        await axios.post(`${COMPUTE_ENGINE_URL}/auth/session/clear`);
      } catch (error) {
        console.error('Failed to clear session from compute engine:', error);
      }
    }
    
    // Always clear localStorage as well
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_cache');
  }

  async getAccessToken(): Promise<string | null> {
    if (this.useComputeEngine) {
      try {
        const response = await axios.get(`${COMPUTE_ENGINE_URL}/auth/session/token`);
        return response.data.access_token;
      } catch (error) {
        console.error('Failed to get token from compute engine:', error);
        return localStorage.getItem('access_token');
      }
    } else {
      return localStorage.getItem('access_token');
    }
  }

  // Workspace Management
  async syncWorkspaceState(workspace: any) {
    if (this.useComputeEngine) {
      try {
        const response = await axios.post(`${COMPUTE_ENGINE_URL}/workspaces/sync`, {
          workspace_id: workspace.id.toString(),
          name: workspace.name,
          workspace_type: workspace.workspace_type,
          visibility: workspace.visibility,
          owner_id: workspace.owner?.id?.toString(),
          sync_version: workspace.sync_version || 0,
          member_count: workspace.member_count || 0,
          project_count: workspace.project_count || 0,
          last_synced: new Date().toISOString(),
          data: workspace
        });
        return response.data;
      } catch (error) {
        console.error('Failed to sync workspace to compute engine:', error);
      }
    }
    
    // Always sync to localStorage as backup
    const cached = localStorage.getItem('workspaces_cache');
    let workspaces = cached ? JSON.parse(cached) : [];
    const index = workspaces.findIndex((w: any) => w.id === workspace.id);
    
    if (index >= 0) {
      workspaces[index] = workspace;
    } else {
      workspaces.push(workspace);
    }
    
    localStorage.setItem('workspaces_cache', JSON.stringify(workspaces));
  }

  async getLocalWorkspaces(): Promise<any[]> {
    if (this.useComputeEngine) {
      try {
        const response = await axios.get(`${COMPUTE_ENGINE_URL}/workspaces/`);
        return response.data.workspaces || [];
      } catch (error) {
        console.error('Failed to get workspaces from compute engine:', error);
        return this.getLocalStorageWorkspaces();
      }
    } else {
      return this.getLocalStorageWorkspaces();
    }
  }

  private getLocalStorageWorkspaces(): any[] {
    const cached = localStorage.getItem('workspaces_cache');
    return cached ? JSON.parse(cached) : [];
  }

  // Project Management
  async syncProjectState(project: any) {
    if (this.useComputeEngine) {
      try {
        const response = await axios.post(`${COMPUTE_ENGINE_URL}/projects/sync`, {
          project_id: project.id.toString(),
          workspace_id: project.workspace?.toString() || '',
          name: project.name,
          visibility: project.visibility,
          creator_id: project.creator?.id?.toString(),
          sync_version: project.sync_version || 0,
          member_count: project.member_count || 0,
          last_synced: new Date().toISOString(),
          data: project
        });
        return response.data;
      } catch (error) {
        console.error('Failed to sync project to compute engine:', error);
      }
    }
    
    // Always sync to localStorage as backup
    const workspaceId = project.workspace;
    const cacheKey = workspaceId ? `projects_cache_workspace_${workspaceId}` : 'projects_cache_all';
    
    const cached = localStorage.getItem(cacheKey);
    let projects = cached ? JSON.parse(cached) : [];
    const index = projects.findIndex((p: any) => p.id === project.id);
    
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    
    localStorage.setItem(cacheKey, JSON.stringify(projects));
  }

  async getLocalProjects(workspaceId?: number): Promise<any[]> {
    if (this.useComputeEngine) {
      try {
        const url = workspaceId 
          ? `${COMPUTE_ENGINE_URL}/projects/?workspace_id=${workspaceId}`
          : `${COMPUTE_ENGINE_URL}/projects/`;
        const response = await axios.get(url);
        return response.data.projects || [];
      } catch (error) {
        console.error('Failed to get projects from compute engine:', error);
        return this.getLocalStorageProjects(workspaceId);
      }
    } else {
      return this.getLocalStorageProjects(workspaceId);
    }
  }

  private getLocalStorageProjects(workspaceId?: number): any[] {
    const cacheKey = workspaceId !== undefined 
      ? `projects_cache_workspace_${workspaceId}`
      : 'projects_cache_all';
    
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }

  // Sync Queue
  async addToSyncQueue(item: {
    entity_type: string;
    entity_id: string;
    operation: string;
    payload?: string;
  }) {
    if (this.useComputeEngine) {
      try {
        const response = await axios.post(`${COMPUTE_ENGINE_URL}/sync/queue/add`, item);
        return response.data;
      } catch (error) {
        console.error('Failed to add to sync queue:', error);
      }
    }
    
    // Fallback: store in localStorage
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({ ...item, created_at: new Date().toISOString(), status: 'pending' });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  async getSyncStatus() {
    if (this.useComputeEngine) {
      try {
        const response = await axios.get(`${COMPUTE_ENGINE_URL}/sync/status`);
        return response.data;
      } catch (error) {
        console.error('Failed to get sync status:', error);
        return { pending_count: 0, failed_count: 0, offline_mode: true };
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      return {
        pending_count: queue.filter((item: any) => item.status === 'pending').length,
        failed_count: queue.filter((item: any) => item.status === 'failed').length,
        offline_mode: false
      };
    }
  }

  // System Health
  async getSystemStatus() {
    if (this.useComputeEngine) {
      try {
        const response = await axios.get(`${COMPUTE_ENGINE_URL}/health/status`);
        return response.data;
      } catch (error) {
        console.error('Failed to get system status:', error);
        return null;
      }
    }
    return null;
  }

  // Preferences
  async setPreference(key: string, value: string) {
    if (this.useComputeEngine) {
      try {
        await axios.post(`${COMPUTE_ENGINE_URL}/preferences/set`, { key, value });
      } catch (error) {
        console.error('Failed to set preference:', error);
      }
    }
    
    localStorage.setItem(`pref_${key}`, value);
  }

  async getPreference(key: string, defaultValue?: string): Promise<string | null> {
    if (this.useComputeEngine) {
      try {
        const response = await axios.get(`${COMPUTE_ENGINE_URL}/preferences/get`, {
          params: { key }
        });
        return response.data.value;
      } catch (error) {
        console.error('Failed to get preference:', error);
        return localStorage.getItem(`pref_${key}`) || defaultValue || null;
      }
    } else {
      return localStorage.getItem(`pref_${key}`) || defaultValue || null;
    }
  }
}

// Global storage manager instance
export const storageManager = new StorageManager();

// Initialize on module load
storageManager.init();

// FIXED: Offline manager with proper grace period tracking
class OfflineManager {
  private GRACE_PERIOD_DAYS = GRACE_PERIOD_DAYS;
  private STORAGE_KEY = 'offline_state';

  public getState(): {
    isOffline: boolean;
    lastSync: Date | null;
    graceExpiry: Date | null;
    offlineStartedAt: Date | null;
  } {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return { 
        isOffline: false, 
        lastSync: null, 
        graceExpiry: null,
        offlineStartedAt: null 
      };
    }

    try {
      const parsed = JSON.parse(stored);
      return {
        isOffline: parsed.isOffline || false,
        lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null,
        graceExpiry: parsed.graceExpiry ? new Date(parsed.graceExpiry) : null,
        offlineStartedAt: parsed.offlineStartedAt ? new Date(parsed.offlineStartedAt) : null,
      };
    } catch {
      return { 
        isOffline: false, 
        lastSync: null, 
        graceExpiry: null,
        offlineStartedAt: null 
      };
    }
  }

  private setState(state: {
    isOffline: boolean;
    lastSync: Date | null;
    graceExpiry: Date | null;
    offlineStartedAt: Date | null;
  }) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  async checkConnectivity(): Promise<{
    online: boolean;
    status?: string;
    timestamp?: string;
    error?: string;
  }> {
    if (!navigator.onLine) {
      return { online: false, error: 'Browser offline' };
    }

    try {
      // Use GET request for detailed health info
      const response = await fetch('http://localhost:8000/api/health/', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        return { 
          online: false, 
          error: `Server returned ${response.status}` 
        };
      }

      const data = await response.json();
      return {
        online: true,
        status: data.status,
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.warn('Backend detailed check failed:', error);
      return { 
        online: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  handleNetworkError() {
    const state = this.getState();
    
    // Only start grace period if not already offline
    if (!state.isOffline) {
      const now = new Date();
      const graceExpiry = new Date(now.getTime() + this.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      
      this.setState({
        isOffline: true,
        lastSync: now,
        graceExpiry: graceExpiry,
        offlineStartedAt: now,
      });

      console.log(`📴 Offline mode activated. Grace period: ${this.GRACE_PERIOD_DAYS} days`);
      console.log(`⏰ Grace expires at:`, graceExpiry.toISOString());
    }
  }

  markAsOnline() {
    const state = this.getState();
    
    if (state.isOffline) {
      this.setState({
        isOffline: false,
        lastSync: new Date(),
        graceExpiry: null,
        offlineStartedAt: null,
      });

      console.log('🌐 Back online - grace period reset');
    }
  }

  isWithinGracePeriod(): boolean {
    const state = this.getState();
    
    if (!state.isOffline || !state.graceExpiry) {
      return false;
    }

    const now = new Date();
    const withinPeriod = now < state.graceExpiry;
    
    console.log(`🔍 Grace period check:`, {
      now: now.toISOString(),
      expires: state.graceExpiry.toISOString(),
      withinPeriod,
      daysRemaining: this.getDaysRemaining()
    });
    
    return withinPeriod;
  }

  getDaysRemaining(): number {
    const state = this.getState();
    
    if (!state.graceExpiry) {
      return this.GRACE_PERIOD_DAYS;
    }

    const now = new Date();
    const expiry = state.graceExpiry;
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  shouldForceLogout(): boolean {
    const withinGrace = this.isWithinGracePeriod();
    const state = this.getState();
    const shouldForce = !withinGrace && state.isOffline;
    
    console.log(`🚪 Should force logout:`, shouldForce, {
      withinGrace,
      isOffline: state.isOffline
    });
    
    return shouldForce;
  }

  clearState() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🧹 Offline state cleared');
  }
}

export const offlineManager = new OfflineManager();