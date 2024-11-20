import { Message } from 'discord.js';
import { container } from '@sapphire/framework';

import { guildService } from '../../services';
import { DEFAULT_PREFIX } from '../../config';

export async function fetchPrefix(message: Message) {
  if (message.inGuild()) {
    const guildCfg = await guildService.findOrCreateGuildConfig(message.guildId, { cache: true, instanceId: container.alterInstanceId });
    return guildCfg?.prefix || DEFAULT_PREFIX;
  }
  return DEFAULT_PREFIX;
}