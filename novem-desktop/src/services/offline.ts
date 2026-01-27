import { backendAPI } from './api';

interface OfflineState {
  isOffline: boolean;
  graceExpiry: Date | null;
  lastSync: Date | null;
  pendingOperations: any[];
}

class OfflineManager {
  private static instance: OfflineManager;
  private offlineState: OfflineState;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.offlineState = this.loadOfflineState();
    this.startHeartbeat();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private loadOfflineState(): OfflineState {
    const stored = localStorage.getItem('offline_state');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        graceExpiry: parsed.graceExpiry ? new Date(parsed.graceExpiry) : null,
        lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null,
      };
    }
    return {
      isOffline: false,
      graceExpiry: null,
      lastSync: null,
      pendingOperations: [],
    };
  }

  private saveOfflineState() {
    localStorage.setItem('offline_state', JSON.stringify(this.offlineState));
  }

  /**
   * Start heartbeat to check backend connectivity
   */
  private startHeartbeat() {
    this.syncInterval = setInterval(async () => {
      await this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if backend is reachable
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      await backendAPI.healthCheck();
      
      if (this.offlineState.isOffline) {
        console.log('✅ Backend reconnected - triggering sync');
        await this.syncPendingOperations();
      }
      
      this.offlineState.isOffline = false;
      this.offlineState.lastSync = new Date();
      this.saveOfflineState();
      
      return true;
    } catch (error) {
      console.warn('⚠️ Backend unreachable - entering offline mode');
      this.enterOfflineMode();
      return false;
    }
  }

  /**
   * Enter offline grace period
   */
  private enterOfflineMode() {
    if (!this.offlineState.isOffline) {
      const graceExpiry = new Date();
      graceExpiry.setDate(graceExpiry.getDate() + 7); // 7 days grace
      
      this.offlineState.isOffline = true;
      this.offlineState.graceExpiry = graceExpiry;
      this.saveOfflineState();
      
      console.log(`🔒 Offline mode activated. Grace period expires: ${graceExpiry}`);
    }
  }

  /**
   * Check if still within grace period
   */
  isWithinGracePeriod(): boolean {
    if (!this.offlineState.isOffline || !this.offlineState.graceExpiry) {
      return true; // Online mode
    }
    
    return new Date() < this.offlineState.graceExpiry;
  }

  /**
   * Get days remaining in grace period
   */
  getDaysRemaining(): number {
    if (!this.offlineState.graceExpiry) return 7;
    
    const now = new Date();
    const diff = this.offlineState.graceExpiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Queue an operation for later sync
   */
  queueOperation(operation: {
    type: string;
    endpoint: string;
    method: string;
    data: any;
    timestamp: Date;
  }) {
    this.offlineState.pendingOperations.push(operation);
    this.saveOfflineState();
    console.log(`📋 Operation queued for sync: ${operation.type}`);
  }

  /**
   * Sync all pending operations when back online
   */
  private async syncPendingOperations() {
    const operations = [...this.offlineState.pendingOperations];
    this.offlineState.pendingOperations = [];
    this.saveOfflineState();

    console.log(`🔄 Syncing ${operations.length} pending operations...`);

    for (const op of operations) {
      try {
        await backendAPI.client.request({
          url: op.endpoint,
          method: op.method,
          data: op.data,
        });
        console.log(`✅ Synced: ${op.type}`);
      } catch (error) {
        console.error(`❌ Failed to sync: ${op.type}`, error);
        // Re-queue failed operations
        this.queueOperation(op);
      }
    }
  }

  /**
   * Get offline state
   */
  getState(): OfflineState {
    return { ...this.offlineState };
  }

  /**
   * Handle network error detected by API
   */
  handleNetworkError() {
    this.enterOfflineMode();
  }

  /**
   * Mark system as online after successful API call
   */
  markAsOnline() {
    if (this.offlineState.isOffline) {
      console.log('✅ Marked as online - clearing offline state');
      this.offlineState.isOffline = false;
      this.offlineState.lastSync = new Date();
      this.saveOfflineState();
    }
  }

  /**
   * Force logout if grace expired
   */
  shouldForceLogout(): boolean {
    return this.offlineState.isOffline && !this.isWithinGracePeriod();
  }

  /**
   * Clear offline state on logout
   */
  clearState() {
    this.offlineState = {
      isOffline: false,
      graceExpiry: null,
      lastSync: null,
      pendingOperations: [],
    };
    this.saveOfflineState();
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const offlineManager = OfflineManager.getInstance();