import type { RedisClientType } from "redis";
import { redisClient } from "../config/redis.config.js";

export interface IRedisUtility {
  get: (key: string) => Promise<string | null>;
  set: (key: string, val: string, ttl?: number) => Promise<void>;
  del: (...keys: string[]) => Promise<void>;
  incr: (key: string) => Promise<number>;
  getVersion: (key: string) => Promise<number>;
}

const DEFAULT_TTL_SECONDS = 15*60; //15 min cache

export class RedisUtility implements IRedisUtility {
  private async run<T>(op: (c: RedisClientType) => Promise<T>, fallback: T): Promise<T> {
    try {
      const c = await redisClient();
      if (!c) return fallback;
      return await op(c);
    } catch (error: any) {
      console.error("Redis operation failed:", error?.message || error);
      return fallback;
    }
  }

  get(key: string) {
    return this.run((c) => c.get(key), null as string | null);
  }

  async set(key: string, val: string, ttl: number = DEFAULT_TTL_SECONDS) {
    await this.run(async (c) => {
      await c.set(key, val, { EX: ttl });
    }, undefined);
  }

  async del(...keys: string[]) {
    if (keys.length === 0) return;
    await this.run(async (c) => {
      await c.del(keys);
    }, undefined);
  }

  incr(key: string) {
    return this.run((c) => c.incr(key), 0);
  }

  async getVersion(key: string) {
    const raw = await this.get(key);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
}

export const redisUtil = new RedisUtility();