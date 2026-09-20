import { createClient, type RedisClientType } from 'redis';

interface IConfig{
    USERNAME:string,
    PASSWORD:string
}
const config: IConfig  = {
    USERNAME: process.env.REDIS_USERNAME as string,
    PASSWORD: process.env.REDIS_PASSWORD as string
}
let client:RedisClientType | null = null
// console.log("redis")
export const redisClient = async() => {
    if(client && client.isOpen){
        return client;
    }

    client = createClient({
        username: config.USERNAME,
        password: config.PASSWORD,
        socket: {
            host: 'air-wren-physical-87985.db.redis.io',
            port: 11403
        }
    });
    client.on('error', err => console.log('Redis Client Error', err));
    client.on('connec', ()=>console.log('Connected to Redis'));
    await client.connect();
    
    // await client.set('foo', 'bar');
    // const result = await client.get('foo');
    // console.log("from redis",result)
    // await client.del('foo')

    return client;
}




