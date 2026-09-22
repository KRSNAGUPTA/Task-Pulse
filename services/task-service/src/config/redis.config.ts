import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;

function baseOptions(): Record<string, unknown> | null {
  const url = process.env.REDIS_URL;
  if (url) return { url };

  const host = process.env.REDIS_HOST;
  if (!host) return null;

  return {
    username: process.env.REDIS_USERNAME ,
    password: process.env.REDIS_PASSWORD ,
    socket: { host, port: 11403 },
  };
}


export const redisClient = async (): Promise<RedisClientType | null> => {
  if (client?.isReady) return client;
  if (connecting) return connecting;

  const base = baseOptions();
  if (!base) return null;

  connecting = (async () => {
    try {
      const cli = createClient({
        ...base,
        disableOfflineQueue: true,
        socket: {
          ...((base.socket as object) ?? {}),
          connectTimeout: 3000,
          reconnectStrategy: (retries: number) => Math.min(retries * 200, 5000),
        },
      } as any) as unknown as RedisClientType;

      cli.on("error", (err) => console.error("Redis client error:", err?.message || err));
      cli.on("ready", () => console.log("Connected to Redis"));

      await cli.connect();
      client = cli;
      return cli;
    } catch (error: any) {
      console.error("Redis unavailable, continuing without cache:", error?.message || error);
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
};

export const closeRedis = async (): Promise<void> => {
  if (client?.isOpen) await client.quit();
  client = null;
};