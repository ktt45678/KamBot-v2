import '@sapphire/framework';
import '@sapphire/pieces';
import { Cache, MemoryCache } from 'cache-manager';
import { ioRedisStore } from '@tirke/node-cache-manager-ioredis';
import { DiskStore } from 'cache-manager-fs-stream';
import { Shoukaku } from 'shoukaku';
import { DiscordTogether } from 'discord-together';

import { MusicQueueManager } from '../modules';

declare module '@sapphire/framework' {
  interface DetailedDescriptionCommandObject {
    usage?: string;
    examples?: string[];
    extendedHelp?: string;
  }

  interface Preconditions {
    OwnerOnly: never;
    MentionPrefix: never;
    MusicBot: never;
  }
}

declare module '@sapphire/pieces' {
  interface Container {
    discordTogether: DiscordTogether<{ [x: string]: string; }>;
    memoryCache: MemoryCache;
    redisCache: Cache<ReturnType<ioRedisStore>>;
    diskCache: Cache<DiskStore>;
    playerManager: Shoukaku;
    queueManager: MusicQueueManager;
  }
}