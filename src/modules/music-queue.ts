import { container } from '@sapphire/framework';
import { Player, Track } from 'shoukaku';
import { shuffle } from 'lodash';

import { KamBotClient } from '../client';
import { EmbedBuilder, TextBasedChannel } from 'discord.js';
import { EmbedColors } from '../common/enums';
import { MusicConfig } from '../common/configs';

export interface QueueOptions {
  client: KamBotClient;
  guildId: string;
  channel: TextBasedChannel;
  voiceChannelId: string;
}

export interface UserTrack {
  userId: string;
  trackData: Track;
  played: boolean;
}

export interface PlayOptions {
  skipCurrent: boolean;
}

export interface DisconnectOptions {
  sendEmptyQueueMessage: boolean;
}

export enum RepeatMode {
  Off,
  Once,
  All
}

export class MusicQueue {
  public readonly client: KamBotClient;
  public guildId: string;
  public channel: TextBasedChannel;
  public voiceChannelId: string;
  public tracks: UserTrack[];
  public current: UserTrack | null;
  public repeat: RepeatMode;
  public volume: number;
  public player: Player | null;
  public initialized: boolean;
  private pauseTimeout: NodeJS.Timeout | null;
  private stopTimeout: NodeJS.Timeout | null;

  constructor(options: QueueOptions) {
    this.client = options.client;
    this.guildId = options.guildId;
    this.channel = options.channel;
    this.voiceChannelId = options.voiceChannelId;
    this.tracks = [];
    this.current = null;
    this.repeat = RepeatMode.Off;
    this.volume = 1;
    this.player = null;
    this.initialized = false;
    this.pauseTimeout = null;
    this.stopTimeout = null;
  }

  public async connect() {
    if (this.initialized)
      return;
    // Join channel
    this.player = await container.playerManager.joinVoiceChannel({
      guildId: this.guildId,
      channelId: this.voiceChannelId,
      shardId: 0
    });
    // Track end event
    this.player.on('end', data => {
      if (data.reason !== 'stopped' && data.reason !== 'replaced') {
        if (this.repeat === RepeatMode.Once) {
          this.tracks.unshift(this.current!);
        }
        if (this.repeat === RepeatMode.All) {
          this.current!.played = true;
          this.tracks.push(this.current!);
        }
      }
      this.play();
    });
    // Websocket connection closed event
    this.player.on('closed', async () => {
      this.disconnect();
    });
    // Error event
    this.player.on('exception', async error => {
      container.logger.error(error);
      await Promise.all([
        this.sendEmbedMessage(new EmbedBuilder()
          .setColor(EmbedColors.Error)
          .setAuthor({ name: 'Something went wrong' })
          .setDescription('The player has encountered an unexpected error')),
        this.disconnect()
      ]);
    });
    this.initialized = true;
  }

  public addTrack(userId: string, track: Track) {
    this.tracks.push({
      userId: userId,
      trackData: track,
      played: false
    });
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  public hasCurrentTrack() {
    return this.current !== null;
  }

  public getNextTrack(): UserTrack | null {
    return this.tracks[0] || null;
  }

  public play() {
    this.current = this.tracks.shift() || null;
    if (!this.current) {
      this.waitForDisconnect(MusicConfig.DisconnectTimeout);
      return;
    }
    this.player!.playTrack({ track: this.current.trackData.encoded });
  }

  public skip() {
    this.player!.stopTrack();
  }

  public shuffle() {
    if (!this.tracks.length) return;
    this.tracks = shuffle(this.tracks);
  }

  public getPaused() {
    return this.player!.paused;
  }

  public setPaused(pause: boolean) {
    this.player!.setPaused(pause);
    if (pause) {
      this.waitForUnpause(MusicConfig.PauseTimeout);
    } else if (this.pauseTimeout !== null) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
  }

  public getVolume() {
    return this.volume;
  }

  public setVolume(volume: number) {
    this.player!.setGlobalVolume(volume);
  }

  public getRepeat() {
    return this.volume;
  }

  public setRepeat(repeat: RepeatMode) {
    this.repeat = repeat;
  }

  public async disconnect(options: DisconnectOptions = { sendEmptyQueueMessage: true }) {
    const sendMessagePromise = options.sendEmptyQueueMessage ? this.sendEmbedMessage(new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player stopped' })
      .setDescription('There is no more music in the queue')) : null;
    const leavePromise = container.playerManager.leaveVoiceChannel(this.player!.guildId);
    await Promise.all([sendMessagePromise, leavePromise]);
    this.cleanup();
  }

  private cleanup() {
    if (this.player) {
      this.player.stopTrack();
      this.player.clean();
    }
    if (this.pauseTimeout !== null) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    this.player = null;
    this.tracks = [];
    this.current = null;
    container.queueManager.delete(this.guildId);
  }

  private waitForUnpause(ms: number) {
    if (this.pauseTimeout !== null) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    this.pauseTimeout = setTimeout(() => {
      this.setPaused(false);
    }, ms);
  }

  private waitForDisconnect(ms: number) {
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    this.stopTimeout = setTimeout(() => {
      this.disconnect();
    }, ms);
  }

  public sendNormalMessage(message: string) {
    if (!this.channel) return;
    return this.channel.send({ content: message });
  }

  public sendEmbedMessage(embed: EmbedBuilder) {
    if (!this.channel) return;
    return this.channel.send({ embeds: [embed] });
  }
}