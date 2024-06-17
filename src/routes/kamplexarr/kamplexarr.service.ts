import { container } from '@sapphire/framework';
import { WebhookMessageCreateOptions } from 'discord.js';

import { HttpException } from '../../common/exceptions/http.exception';

export class KamplexarrService {
  async sendWebhook(guildId: string, channelId: string, message: WebhookMessageCreateOptions) {
    const client = container.client;
    if (!client) return null;
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      throw new HttpException({ status: 404, message: 'Server not found' });
    }
    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      throw new HttpException({ status: 404, message: 'Channel not found' });
    } else if (!channel.isThread() && !channel.isTextBased()) {
      throw new HttpException({ status: 400, message: 'Channel must be text channel' });
    }
    return channel.send(message);
  }
}

export const kamplexarrService = new KamplexarrService();