import { container } from '@sapphire/framework';
import { caching } from 'cache-manager';
import { ioRedisStore } from '@tirke/node-cache-manager-ioredis';
import { create } from 'cache-manager-fs-stream';
import Redis from 'ioredis';

import { REDIS_URL } from '../config';

export async function bootstraptCacheManager() {
  container.memoryCache = await caching('memory', {
    max: 100,
    ttl: 100_000 // 100 seconds
  });

  container.redisCache = await caching(ioRedisStore, {
    redisInstance: new Redis(REDIS_URL),
    ttl: 100_000
  });

  container.diskCache = await caching(create({
    ttl: 100_000,
    maxsize: 262_144_000, // 250MiB
    path: '.cache'
  }));

  container.redisCache.store.client.on('error', (err: any) => {
    console.error('Redis error: ' + err);
  });
}

bootstraptCacheManager();