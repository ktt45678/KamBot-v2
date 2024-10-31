import { container, LogLevel, SapphireClient } from '@sapphire/framework';
import { DiscordTogether } from 'discord-together';
import { ActivityType, GatewayIntentBits, Partials } from 'discord.js';
import { Connectors, Shoukaku } from 'shoukaku';

import { MusicQueueManager } from './modules/music-queue-manager';
import { fetchPrefix } from './common/hooks';
import { BOT_ALTER_INSTANCE_ID, BOT_TOKEN, DEFAULT_PREFIX, LAVALINK_AUTH, LAVALINK_NAME, LAVALINK_URL } from './config';

export class KamBotClient extends SapphireClient {
  public constructor() {
    super({
      defaultPrefix: DEFAULT_PREFIX,
      fetchPrefix: fetchPrefix,
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
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
      ],
      partials: [
        Partials.Channel,
        Partials.Message
      ],
      loadMessageCommandListeners: true,
      presence: {
        activities: [
          {
            name: `${DEFAULT_PREFIX}help`,
            type: ActivityType.Listening
          }
        ]
      }
    });
    container.isAlterInstance = BOT_ALTER_INSTANCE_ID != null;
    container.alterInstanceId = BOT_ALTER_INSTANCE_ID;
  }

  public override async login(token?: string) {
    container.discordTogether = new DiscordTogether(container.client);
    this.initPlayer();
    const login = await super.login(token);
    this.initCustomMessageListerner();
    return login;
  }

  public override async destroy() {
    await this.destroyPlayer();
    return super.destroy();
  }

  private initCustomMessageListerner() {
    this.on('messageCreate', async (message) => {
      const prefix = await fetchPrefix(message);
      if (!message.content.startsWith(prefix))
        return;
      const messageCommand = message.content.split(' ');
      const messageCommandName = messageCommand.shift();
      if (messageCommandName === prefix + prefix) {
        message.content = prefix + 'quoteadd' + (messageCommand.length ? ' ' + messageCommand.join(' ') : '');
      } else if (messageCommandName === prefix + prefix + prefix) {
        message.content = prefix + 'quoteshow' + (messageCommand.length ? ' ' + messageCommand.join(' ') : '');
      }
    });
  }

  private initPlayer() {
    container.playerManager = new Shoukaku(new Connectors.DiscordJS(this), [{
      name: LAVALINK_NAME,
      url: LAVALINK_URL,
      auth: LAVALINK_AUTH
    }]);
    container.playerManager.on('ready', (name, resumed) => {
      this.logger.info(`Lavalink Node: ${name} is now connected. This connection is ${resumed ? 'resumed' : 'a new connection'}`);
    });
    container.playerManager.on('error', (name, error) => {
      this.logger.error(error);
    });
    container.playerManager.on('close', (name, code, reason) => {
      this.logger.info(`Lavalink Node: ${name} closed with code ${code} - ${reason || 'No reason'}`);
    });
    container.playerManager.on('disconnect', (name, count) => {
      this.logger.info(`Lavalink Node: ${name} disconnected - count: ${count}`);
    });
    container.queueManager = new MusicQueueManager(this);
  }

  private async destroyPlayer() {
    container.queueManager.forEach(async p => {
      await p.disconnect();
    });
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
