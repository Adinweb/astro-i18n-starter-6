import { describe, it, expect } from 'vitest';
import { SystemService } from './systemService';

describe('backend/services', () => {
  it('SystemService returns valid health status', () => {
    const health = SystemService.getHealthStatus();
    expect(health.status).toBe('ok');
    expect(typeof health.uptimeSeconds).toBe('number');
    expect(typeof health.timestamp).toBe('string');
    expect(health.version).toBe('0.0.1');
  });
});
