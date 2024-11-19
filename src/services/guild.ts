import { container } from '@sapphire/framework';
import { FlattenMaps } from 'mongoose';

import { Guild, guildModel } from '../models';
import { CachePrefix } from '../common/enums';

export interface FindGuildConfigOptions {
  cache: boolean;
  instanceId?: number | null;
}

export class GuildService {
  async findOrCreateGuildConfig(guildId: string, options: FindGuildConfigOptions = { cache: true }) {
    options.instanceId && (guildId = guildId + '-' + options.instanceId);
    const cacheKey = `${CachePrefix.GuildConfig}:${guildId}`;
    if (options.cache) {
      const cfg = await container.memoryCache.get<FlattenMaps<Guild>>(cacheKey);
      if (cfg) return cfg;
    }
    const cfg = await guildModel.findOneAndUpdate({ _id: guildId, instanceId: options.instanceId }, {},
      { upsert: true, setDefaultsOnInsert: true }).lean().exec();
    if (options.cache)
      await container.memoryCache.set(cacheKey, cfg, 3_600_000);
    return cfg;
  }

  async setBotPrefix(guildId: string, prefix: string, instanceId?: number | null) {
    instanceId && (guildId = guildId + '-' + instanceId);
    const cfg = await guildModel.findOneAndUpdate({ _id: guildId, instanceId }, { $set: { prefix } }, { upsert: true, new: true }).lean().exec();
    const cacheKey = `${CachePrefix.GuildConfig}:${guildId}`;
    await container.memoryCache.set(cacheKey, cfg, 3_600_000);
  }
}

export const guildService = new GuildService();