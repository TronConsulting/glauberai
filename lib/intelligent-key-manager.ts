/**
 * Intelligent Multi-Key Manager
 * Handles API key rotation, health monitoring, and intelligent selection
 */

export interface ApiKeyHealth {
  keyIndex: number;
  keyPreview: string; // First/last 4 chars for identification
  successCount: number;
  failureCount: number;
  rateLimitCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  isHealthy: boolean;
  healthScore: number; // 0-100
  cooldownUntil?: number;
  avgLatency: number;
  lastErrorType?: string;
}

export interface KeyRotationConfig {
  maxConsecutiveFailures: number;
  cooldownPeriod: number; // ms
  healthDecayRate: number; // How fast health degrades (0-1)
  recoveryRate: number; // How fast health recovers on success (0-1)
  maxRetriesPerKey: number;
  rateLimitBackoffMultiplier: number;
}

export class IntelligentKeyManager {
  private static instance: IntelligentKeyManager;
  private keyHealthMap = new Map<string, Map<number, ApiKeyHealth>>(); // modelId -> keyIndex -> health
  private config: KeyRotationConfig;
  private globalStats = {
    totalRequests: 0,
    totalKeyFailures: 0,
    totalRateLimits: 0,
    keysRotated: 0
  };

  private constructor() {
    this.config = {
      maxConsecutiveFailures: 3,
      cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      healthDecayRate: 0.3,
      recoveryRate: 0.2,
      maxRetriesPerKey: 2,
      rateLimitBackoffMultiplier: 2.5
    };
  }

  public static getInstance(): IntelligentKeyManager {
    if (!IntelligentKeyManager.instance) {
      IntelligentKeyManager.instance = new IntelligentKeyManager();
    }
    return IntelligentKeyManager.instance;
  }

  /**
   * Register a model's API keys for health tracking
   */
  public registerModelKeys(modelId: string, apiKeys: string[]): void {
    if (!this.keyHealthMap.has(modelId)) {
      this.keyHealthMap.set(modelId, new Map());
    }

    const modelHealth = this.keyHealthMap.get(modelId)!;
    
    apiKeys.forEach((key, index) => {
      if (!modelHealth.has(index)) {
        const keyPreview = this.createKeyPreview(key);
        modelHealth.set(index, {
          keyIndex: index,
          keyPreview,
          successCount: 0,
          failureCount: 0,
          rateLimitCount: 0,
          consecutiveFailures: 0,
          isHealthy: true,
          healthScore: 100,
          avgLatency: 0,
          lastErrorType: undefined
        });
      }
    });

    console.log(`📋 Registered ${apiKeys.length} keys for model ${modelId}`);
  }

  /**
   * Get the best key index for a model based on health scores
   */
  public getBestKeyIndex(modelId: string): number {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth || modelHealth.size === 0) {
      return 0;
    }

    // Filter out keys in cooldown
    const availableKeys = Array.from(modelHealth.values()).filter(
      health => !health.cooldownUntil || Date.now() > health.cooldownUntil
    );

    if (availableKeys.length === 0) {
      // All keys in cooldown, return the one with highest health
      const allKeys = Array.from(modelHealth.values());
      allKeys.sort((a, b) => b.healthScore - a.healthScore);
      return allKeys[0].keyIndex;
    }

    // Weighted random selection based on health score
    const totalWeight = availableKeys.reduce((sum, key) => sum + Math.max(1, key.healthScore), 0);
    let random = Math.random() * totalWeight;
    
    for (const key of availableKeys) {
      random -= Math.max(1, key.healthScore);
      if (random <= 0) {
        return key.keyIndex;
      }
    }

    return availableKeys[0].keyIndex;
  }

  /**
   * Get next key index using round-robin with health prioritization
   */
  public getNextKeyIndex(modelId: string, currentIndex: number): number {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth || modelHealth.size <= 1) {
      return 0;
    }

    const keys = Array.from(modelHealth.values());
    
    // Sort by health score (descending), but avoid immediate reuse of failed key
    const sortedKeys = [...keys].sort((a, b) => {
      // Prioritize healthier keys
      const healthDiff = b.healthScore - a.healthScore;
      if (Math.abs(healthDiff) > 10) return healthDiff;
      
      // If similar health, avoid recently failed key
      if (a.keyIndex === currentIndex && a.consecutiveFailures > 0) return 1;
      if (b.keyIndex === currentIndex && b.consecutiveFailures > 0) return -1;
      
      return b.successCount - a.successCount;
    });

    return sortedKeys[0].keyIndex;
  }

  /**
   * Record a successful API call
   */
  public recordSuccess(modelId: string, keyIndex: number, latency: number): void {
    const health = this.getOrCreateHealth(modelId, keyIndex);
    if (!health) return;

    health.successCount++;
    health.consecutiveFailures = 0;
    health.lastSuccessTime = Date.now();
    health.isHealthy = true;
    
    // Improve health score
    health.healthScore = Math.min(100, health.healthScore + (this.config.recoveryRate * 10));
    
    // Update average latency (exponential moving average)
    if (health.avgLatency === 0) {
      health.avgLatency = latency;
    } else {
      health.avgLatency = health.avgLatency * 0.7 + latency * 0.3;
    }

    // Clear cooldown if set
    if (health.cooldownUntil && Date.now() >= health.cooldownUntil) {
      health.cooldownUntil = undefined;
    }

    this.globalStats.totalRequests++;
  }

  /**
   * Record a failed API call
   */
  public recordFailure(modelId: string, keyIndex: number, errorType: string): void {
    const health = this.getOrCreateHealth(modelId, keyIndex);
    if (!health) return;

    health.failureCount++;
    health.consecutiveFailures++;
    health.lastFailureTime = Date.now();
    health.lastErrorType = errorType;

    // Degrade health score
    const decayMultiplier = errorType === 'rate_limit' ? 2 : 1;
    health.healthScore = Math.max(
      0,
      health.healthScore - (this.config.healthDecayRate * 10 * decayMultiplier)
    );

    // Check if key should be marked unhealthy
    if (health.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      health.isHealthy = false;
      health.cooldownUntil = Date.now() + this.config.cooldownPeriod;
      console.log(`⚠️ Key ${health.keyPreview} for model ${modelId} placed in cooldown for ${this.config.cooldownPeriod / 1000}s`);
    }

    // Track rate limits specially
    if (errorType === 'rate_limit') {
      health.rateLimitCount++;
      this.globalStats.totalRateLimits++;
    }

    this.globalStats.totalKeyFailures++;
  }

  /**
   * Get health status for all keys of a model
   */
  public getModelKeyHealth(modelId: string): ApiKeyHealth[] {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth) return [];
    
    return Array.from(modelHealth.values()).sort((a, b) => a.keyIndex - b.keyIndex);
  }

  /**
   * Get best performing key for a model
   */
  public getBestKey(modelId: string): { keyIndex: number; health: ApiKeyHealth } | null {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth || modelHealth.size === 0) return null;

    const best = Array.from(modelHealth.values())
      .filter(h => h.isHealthy || h.healthScore > 20)
      .sort((a, b) => b.healthScore - a.healthScore)[0];

    return best ? { keyIndex: best.keyIndex, health: best } : null;
  }

  /**
   * Get key distribution stats
   */
  public getKeyDistribution(modelId: string): { healthy: number; degraded: number; offline: number } {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth) return { healthy: 0, degraded: 0, offline: 0 };

    let healthy = 0, degraded = 0, offline = 0;
    const now = Date.now();

    for (const health of modelHealth.values()) {
      if (health.cooldownUntil && now < health.cooldownUntil) {
        offline++;
      } else if (health.healthScore >= 70) {
        healthy++;
      } else if (health.healthScore >= 30) {
        degraded++;
      } else {
        offline++;
      }
    }

    return { healthy, degraded, offline };
  }

  /**
   * Get global statistics
   */
  public getGlobalStats(): typeof this.globalStats & {
    trackedModels: number;
    totalKeys: number;
  } {
    let totalKeys = 0;
    for (const modelHealth of this.keyHealthMap.values()) {
      totalKeys += modelHealth.size;
    }

    return {
      ...this.globalStats,
      trackedModels: this.keyHealthMap.size,
      totalKeys
    };
  }

  /**
   * Reset health for a specific key (manual recovery)
   */
  public resetKeyHealth(modelId: string, keyIndex: number): boolean {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth) return false;

    const health = modelHealth.get(keyIndex);
    if (!health) return false;

    health.consecutiveFailures = 0;
    health.isHealthy = true;
    health.healthScore = 100;
    health.cooldownUntil = undefined;
    health.lastErrorType = undefined;

    console.log(`✅ Reset health for key ${health.keyPreview} of model ${modelId}`);
    return true;
  }

  /**
   * Reset all health data (useful after system restart)
   */
  public resetAllHealth(): void {
    for (const modelHealth of this.keyHealthMap.values()) {
      for (const health of modelHealth.values()) {
        health.consecutiveFailures = 0;
        health.isHealthy = true;
        health.healthScore = 100;
        health.cooldownUntil = undefined;
      }
    }
    console.log('🔄 Reset all key health status');
  }

  /**
   * Get recommended retry delay for a specific key
   */
  public getRetryDelayForKey(modelId: string, keyIndex: number, baseDelay: number): number {
    const health = this.getOrCreateHealth(modelId, keyIndex);
    if (!health) return baseDelay;

    // Increase delay for unhealthy keys
    const healthFactor = 1 + ((100 - health.healthScore) / 100);
    
    // Add jitter based on consecutive failures
    const failureJitter = Math.min(health.consecutiveFailures * 200, 1000);
    
    return Math.min(
      baseDelay * healthFactor + failureJitter + Math.random() * 500,
      30000 // Max 30s
    );
  }

  /**
   * Determine if we should skip to next model (all keys exhausted)
   */
  public shouldSkipModel(modelId: string): boolean {
    const modelHealth = this.keyHealthMap.get(modelId);
    if (!modelHealth) return false;

    const now = Date.now();
    let unhealthyCount = 0;

    for (const health of modelHealth.values()) {
      if (health.cooldownUntil && now < health.cooldownUntil) {
        unhealthyCount++;
      } else if (health.healthScore < 20) {
        unhealthyCount++;
      }
    }

    return unhealthyCount >= modelHealth.size;
  }

  /**
   * Create an obfuscated preview of the API key for logging
   */
  private createKeyPreview(key: string): string {
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  /**
   * Get or create health tracking for a key
   */
  private getOrCreateHealth(modelId: string, keyIndex: number): ApiKeyHealth | undefined {
    if (!this.keyHealthMap.has(modelId)) {
      this.keyHealthMap.set(modelId, new Map());
    }
    
    const modelHealth = this.keyHealthMap.get(modelId)!;
    if (!modelHealth.has(keyIndex)) {
      // Create placeholder if key not yet registered
      modelHealth.set(keyIndex, {
        keyIndex,
        keyPreview: 'unknown',
        successCount: 0,
        failureCount: 0,
        rateLimitCount: 0,
        consecutiveFailures: 0,
        isHealthy: true,
        healthScore: 50, // Neutral default
        avgLatency: 0
      });
    }
    
    return modelHealth.get(keyIndex);
  }
}

// Export singleton
export const intelligentKeyManager = IntelligentKeyManager.getInstance();
