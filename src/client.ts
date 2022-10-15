import { container, LogLevel, SapphireClient } from '@sapphire/framework';
import { DiscordTogether } from 'discord-together';
import { GatewayIntentBits } from 'discord.js';

import { BOT_TOKEN, DEFAULT_PREFIX } from './config';

export class KamBotClient extends SapphireClient {
  public constructor() {
    super({
      defaultPrefix: DEFAULT_PREFIX,
      caseInsensitiveCommands: true,
      logger: {
        level: LogLevel.Debug
      },
      shards: 'auto',
      allowedMentions: { parse: ['roles', 'users'], repliedUser: true },
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ],
      loadMessageCommandListeners: true
    });
  }

  public override async login(token?: string) {
    container.discordTogether = new DiscordTogether(container.client);
    return super.login(token);
  }

  public override async destroy() {
    return super.destroy();
  }
}

async function bootstrap() {
  const client = new KamBotClient();
  try {
    client.logger.info('Logging in');
    await client.login(BOT_TOKEN);
    client.logger.info('logged in');
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    process.exit(1);
  }
};

bootstrap();
