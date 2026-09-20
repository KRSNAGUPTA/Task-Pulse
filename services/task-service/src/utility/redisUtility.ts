import type { RedisClientType } from "redis";
import { redisClient } from "../config/redis.config.js";


export interface IRedisUtility {
    get:(key:string)=>Promise<string|null>;
    set:(key:string, val:string, ttl?:number)=>Promise<void>;
    del:(key:string)=>Promise<void>;
}


export class RedisUtility implements IRedisUtility{
    private client: RedisClientType | null = null;
    private async getClient():Promise<RedisClientType>{
        if(!this.client || !this.client.isOpen){
            this.client = await redisClient();
        }
        return this.client;
    };

    async set(key: string, val: string, ttl?:number):Promise<void>{
        const client = await this.getClient();
        await client.set(key, val, {EX: ttl || 900}); // default 15 min: 15*60 sec
    }

    async get(key:string):Promise<string|null>{
        const client = await this.getClient();
        return await client.get(key);
    }
    async del(key:string):Promise<void>{
        const client = await this.getClient();
        await client.del(key);
    }

}

export const redisUtil = new RedisUtility();