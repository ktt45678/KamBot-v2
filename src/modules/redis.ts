import { container } from '@sapphire/framework';
import { caching } from 'cache-manager';
import { ioRedisStore } from '@tirke/node-cache-manager-ioredis';
import { mongoDbStore } from '../common/utils';
import Redis from 'ioredis';

import { DATABASE_CACHE_URL, REDIS_URL } from '../config';

export async function bootstraptCacheManager() {
  container.memoryCache = await caching('memory', {
    max: 1000,
    ttl: 100_000 // 100 seconds
  });

  container.redisCache = await caching(ioRedisStore, {
    redisInstance: new Redis(REDIS_URL),
    ttl: 100
  });

  container.mongoDbCache = await caching(mongoDbStore, {
    url: DATABASE_CACHE_URL,
    mongoConfig: { family: 4 },
    max: 2000,
    ttl: 100_000
  });

  container.redisCache.store.client.on('error', (err: any) => {
    console.error('Redis error: ' + err);
  });

  container.mongoDbCache.store.client.on('error', (err: any) => {
    console.error('MongoDB cache error: ' + err);
  });
}

bootstraptCacheManager();