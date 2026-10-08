import type { BackendHealthResponse } from '../types';

const startTime = Date.now();

export class SystemService {
  /**
   * Returns current backend runtime health and operational metrics.
   */
  static getHealthStatus(): BackendHealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      version: '0.0.1',
    };
  }
}
