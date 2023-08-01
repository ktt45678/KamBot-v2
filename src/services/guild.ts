import { container } from '@sapphire/framework';
import { FlattenMaps } from 'mongoose';

import { Guild, guildModel } from '../models';
import { CachePrefix } from '../common/enums';

export interface FindGuildConfigOptions {
  cache: boolean;
}

export class GuildService {
  async findOrCreateGuildConfig(guildId: string, options: FindGuildConfigOptions = { cache: true }) {
    const cacheKey = `${CachePrefix.GuildConfig}:${guildId}`;
    if (options.cache) {
      const cfg = await container.memoryCache.get<FlattenMaps<Guild>>(cacheKey);
      if (cfg) return cfg;
    }
    const cfg = await guildModel.findOneAndUpdate({ _id: guildId }, {}, { upsert: true, setDefaultsOnInsert: true }).lean().exec();
    if (options.cache)
      await container.memoryCache.set(cacheKey, cfg, 3_600_000);
    return cfg;
  }

  async setBotPrefix(guildId: string, prefix: string) {
    const cfg = await guildModel.findOneAndUpdate({ _id: guildId }, { $set: { prefix } }, { upsert: true, new: true }).lean().exec();
    const cacheKey = `${CachePrefix.GuildConfig}:${guildId}`;
    await container.memoryCache.set(cacheKey, cfg, 3_600_000);
  }
}

export const guildService = new GuildService();