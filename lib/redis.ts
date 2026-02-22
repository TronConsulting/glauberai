import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export const getRedis = () => {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('Redis not configured, using in-memory fallback');
      return null;
    }

    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
};

// In-memory fallback for development
class InMemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: any, options?: { ex?: number; px?: number }) {
    const expiry = Date.now() + (options?.ex ? options.ex * 1000 : options?.px || 3600000);
    this.cache.set(key, { value, expiry });
  }

  async incr(key: string) {
    const current = await this.get(key);
    const newValue = (parseInt(current) || 0) + 1;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, seconds: number) {
    const item = this.cache.get(key);
    if (item) {
      item.expiry = Date.now() + seconds * 1000;
    }
  }
}

const inMemoryCache = new InMemoryCache();

export const getCacheClient = () => {
  const redis = getRedis();
  return redis || inMemoryCache;
};
