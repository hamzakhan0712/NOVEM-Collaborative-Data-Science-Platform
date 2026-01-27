import { invoke } from '@tauri-apps/api/core';

export interface ComputeRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
}

export interface ComputeResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
}

class ComputeEngineService {
  async call<T = any>(request: ComputeRequest): Promise<T> {
    try {
      const response = await invoke<ComputeResponse<T>>('call_compute_engine', {
        request,
      });

      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data;
    } catch (error) {
      console.error('Compute engine error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await invoke<boolean>('health_check');
    } catch {
      return false;
    }
  }

  // Data operations
  async importData(file: File, options: any) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.call({
      endpoint: '/api/data/import',
      method: 'POST',
      data: { options },
    });
  }

  // Analysis operations
  async runEDA(datasetId: string, options: any) {
    return this.call({
      endpoint: '/api/analysis/eda',
      method: 'POST',
      data: { dataset_id: datasetId, options },
    });
  }

  // ML operations
  async trainModel(config: any) {
    return this.call({
      endpoint: '/api/ml/train',
      method: 'POST',
      data: config,
    });
  }
}

export const computeEngine = new ComputeEngineService();