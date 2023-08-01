import { container } from '@sapphire/framework';
import { GuildMember, TextBasedChannel } from 'discord.js';
import { Track } from 'shoukaku';

import { KamBotClient } from '../client';
import { MusicQueue } from './music-queue';

export class MusicQueueManager extends Map<string, MusicQueue> {
  client: KamBotClient;

  constructor(client: KamBotClient) {
    super();
    this.client = client;
  }

  async resolveQueue(guildId: string, voiceChannelId: string, channel: TextBasedChannel) {
    let queue = this.findQueue(guildId);
    if (!queue) {
      container.logger.debug(`New connection on guild "${guildId}"`);
      queue = new MusicQueue({
        client: this.client,
        guildId: guildId,
        channel: channel,
        voiceChannelId: voiceChannelId
      });
      await queue.connect();
      this.set(guildId, queue);
      container.logger.debug(`New queue created on guild "${guildId}"`);
    }
    return queue;
  }

  findQueue(guildId: string) {
    return this.get(guildId);
  }
}