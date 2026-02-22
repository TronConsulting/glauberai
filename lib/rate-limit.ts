import { getCacheClient } from './redis';

export interface RateLimitConfig {
  requests: number;
  window: string; // '1m', '1h', '1d'
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

const parseWindow = (window: string): number => {
  const unit = window.slice(-1);
  const value = parseInt(window.slice(0, -1));

  const multipliers: Record<string, number> = {
    's': 1,
    'm': 60,
    'h': 3600,
    'd': 86400,
  };

  return value * (multipliers[unit] || 60);
};

export class RateLimiter {
  private cache = getCacheClient();

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const windowSeconds = parseWindow(config.window);
    const key = `ratelimit:${identifier}:${config.window}`;

    try {
      const current = await this.cache.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= config.requests) {
        const ttl = windowSeconds;
        return {
          allowed: false,
          remaining: 0,
          limit: config.requests,
          resetAt: new Date(Date.now() + ttl * 1000),
        };
      }

      const newCount = await this.cache.incr(key);

      if (newCount === 1) {
        await this.cache.expire(key, windowSeconds);
      }

      return {
        allowed: true,
        remaining: Math.max(0, config.requests - newCount),
        limit: config.requests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open for availability
      return {
        allowed: true,
        remaining: config.requests,
        limit: config.requests,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  }

  async resetLimit(identifier: string, window: string): Promise<void> {
    const key = `ratelimit:${identifier}:${window}`;
    await this.cache.set(key, 0);
  }
}

export const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  // Global IP-based
  GLOBAL_UNAUTHENTICATED: { requests: 50, window: '1h' },
  GLOBAL_AUTHENTICATED: { requests: 2000, window: '1h' },

  // Endpoint-specific
  LOGIN: { requests: 5, window: '15m' },
  SIGNUP: { requests: 3, window: '1h' },
  FORGOT_PASSWORD: { requests: 3, window: '1h' },

  // User-based (by plan)
  STARTER_MESSAGES: { requests: 50, window: '1h' },
  STARTER_DAILY: { requests: 200, window: '1d' },

  PROFESSIONAL_MESSAGES: { requests: 500, window: '1h' },
  PROFESSIONAL_DAILY: { requests: 2000, window: '1d' },
} as const;
