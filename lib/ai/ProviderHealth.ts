import type { ProviderHealthStatus } from './providers/AIProvider';

const COOLDOWN_DURATION_MS = 10 * 60 * 1000; // 10 minutes

class ProviderHealthTracker {
  private healthMap = new Map<string, ProviderHealthStatus>();

  getHealth(providerName: string): ProviderHealthStatus {
    const health = this.healthMap.get(providerName);
    if (!health) {
      const newHealth: ProviderHealthStatus = {
        status: 'healthy',
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
      };
      this.healthMap.set(providerName, newHealth);
      return newHealth;
    }

    // Check if cooldown has expired
    if (health.status === 'cooling_down' && health.cooldownUntil) {
      if (Date.now() >= health.cooldownUntil) {
        health.status = 'healthy';
        health.cooldownUntil = undefined;
        health.lastError = undefined;
        health.lastErrorTime = undefined;
      }
    }

    return health;
  }

  markError(providerName: string, error: string): void {
    const health = this.getHealth(providerName);
    health.status = 'cooling_down';
    health.lastError = error;
    health.lastErrorTime = Date.now();
    health.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
    health.failureCount++;
  }

  markSuccess(providerName: string): void {
    const health = this.getHealth(providerName);
    if (health.status === 'cooling_down') {
      // Don't restore from cooldown on single success
      return;
    }
    health.status = 'healthy';
    health.lastError = undefined;
    health.lastErrorTime = undefined;
    health.cooldownUntil = undefined;
    health.successCount++;
    health.lastUsed = Date.now();
  }

  incrementRequest(providerName: string): void {
    const health = this.getHealth(providerName);
    health.requestCount++;
    health.lastUsed = Date.now();
  }

  isHealthy(providerName: string): boolean {
    const health = this.getHealth(providerName);
    return health.status === 'healthy';
  }

  isAvailable(providerName: string): boolean {
    const health = this.getHealth(providerName);
    return health.status === 'healthy' || health.status === 'cooling_down';
  }

  getStats(providerName: string) {
    const health = this.getHealth(providerName);
    return {
      requestCount: health.requestCount,
      successCount: health.successCount,
      failureCount: health.failureCount,
      successRate: health.requestCount > 0 
        ? (health.successCount / health.requestCount) * 100 
        : 0,
    };
  }

  reset(providerName: string): void {
    this.healthMap.delete(providerName);
  }

  resetAll(): void {
    this.healthMap.clear();
  }
}

export const providerHealth = new ProviderHealthTracker();
