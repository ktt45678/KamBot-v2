import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, GuildMember, Message, TextBasedChannel, User } from 'discord.js';
import { Track } from 'shoukaku';
import { chunk } from 'lodash';

import { musicService } from '../../services';
import { EmbedColors } from '../../common/enums';
import { PaginatedMessage, generateErrorMessage, humanizeTime, isUrl } from '../../common/utils';

interface HandleSongByUrlOptions {
  url: string;
  user: User;
  guildId: string;
  voiceChannelId: string;
  messageChannel: TextBasedChannel;
  sendTrackNotFoundMessage: (embed: EmbedBuilder) => Promise<unknown>;
  sendTrackAddedMessage: (embed: EmbedBuilder) => Promise<unknown>;
  sendPlaylistAddedMessage: (embed: EmbedBuilder) => Promise<unknown>;
}

interface HandleSongSelectionOptions {
  trackName: string;
  user: User;
  guildId: string;
  voiceChannelId: string;
  messageChannel: TextBasedChannel;
  sendTrackNotFoundMessage: (embed: EmbedBuilder) => Promise<unknown>;
  sendTrackAddedMessage: (embed: EmbedBuilder) => Promise<unknown>;
  runPaginatedMessage: (paginaedMessage: PaginatedMessage) => Promise<unknown>;
}

@ApplyOptions<Command.Options>({
  name: 'play',
  aliases: ['addtrack', 'p'],
  fullCategory: ['Music'],
  description: 'Add a track to queue.',
  detailedDescription: {
    usage: '<track name or url>',
    examples: ['first song']
  },
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class PlayCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('input')
            .setDescription('Track name or url')
            .setRequired(true)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) return;
    const track = await args.rest('string').catch(() => null);
    if (!track) {
      const errorMessageEmbed = generateErrorMessage('Please indicate the title of a song');
      return message.channel.send({ embeds: [errorMessageEmbed] });
    }
    if (isUrl(track)) {
      return this.handleUrlSongSelection({
        url: track,
        user: message.author,
        guildId: message.guildId,
        voiceChannelId: message.member!.voice.channelId!,
        messageChannel: message.channel,
        sendTrackNotFoundMessage: (embed) => message.channel.send({ embeds: [embed] }),
        sendTrackAddedMessage: (embed) => message.channel.send({ embeds: [embed] }),
        sendPlaylistAddedMessage: (embed) => message.channel.send({ embeds: [embed] })
      });
    }
    return this.handleSongSelection({
      trackName: track,
      user: message.author,
      guildId: message.guildId,
      voiceChannelId: message.member!.voice.channelId!,
      messageChannel: message.channel,
      sendTrackNotFoundMessage: (embed) => message.channel.send({ embeds: [embed] }),
      sendTrackAddedMessage: (embed) => message.channel.send({ embeds: [embed] }),
      runPaginatedMessage: (paginaedMessage) => paginaedMessage.run(message)
    });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const track = interaction.options.getString('input', true);
    const member = interaction.member instanceof GuildMember ? interaction.member : await interaction.guild!.members.fetch(interaction.user.id);
    await interaction.deferReply();
    if (isUrl(track)) {
      return this.handleUrlSongSelection({
        url: track,
        user: interaction.user,
        guildId: interaction.guildId!,
        voiceChannelId: member!.voice.channelId!,
        messageChannel: interaction.channel!,
        sendTrackNotFoundMessage: (embed) => interaction.followUp({ embeds: [embed] }),
        sendTrackAddedMessage: (embed) => interaction.followUp({ embeds: [embed] }),
        sendPlaylistAddedMessage: (embed) => interaction.followUp({ embeds: [embed] })
      });
    }
    return this.handleSongSelection({
      trackName: track,
      user: interaction.user,
      guildId: interaction.guildId!,
      voiceChannelId: member!.voice.channelId!,
      messageChannel: interaction.channel!,
      sendTrackNotFoundMessage: (embed) => interaction.reply({ embeds: [embed] }),
      sendTrackAddedMessage: (embed) => interaction.followUp({ embeds: [embed] }),
      runPaginatedMessage: (paginaedMessage) => paginaedMessage.run(interaction)
    });
  }

  private async handleUrlSongSelection({ url, user, guildId, voiceChannelId, messageChannel,
    sendTrackNotFoundMessage, sendTrackAddedMessage, sendPlaylistAddedMessage }: HandleSongByUrlOptions) {
    const loadResult = await musicService.loadTracks(url);
    if (!loadResult || loadResult.loadType === 'NO_MATCHES') {
      const errorEmbedMessage = generateErrorMessage(`Could not find the results for **${url}**`);
      return sendTrackNotFoundMessage(errorEmbedMessage);
    }
    const queue = await this.container.queueManager.resolveQueue(guildId, voiceChannelId, messageChannel);
    if (loadResult.loadType === 'TRACK_LOADED') {
      queue.addTrack(user.id, loadResult.tracks[0]);
      if (!queue.hasCurrentTrack())
        queue.play();
      const embedTrackAdded = this.generateTrackAdded(user, loadResult.tracks[0]);
      await sendTrackAddedMessage(embedTrackAdded);
    } else if (loadResult.loadType === 'PLAYLIST_LOADED') {
      for (let i = 0; i < loadResult.tracks.length; i++) {
        queue.addTrack(user.id, loadResult.tracks[i]);
      }
      if (!queue.hasCurrentTrack())
        queue.play();
      const embedPlaylistAdded = this.generatePlaylistAdded(user, loadResult.playlistInfo.name || 'Unknown', url, loadResult.tracks.length);
      await sendPlaylistAddedMessage(embedPlaylistAdded);
    }
  }

  private async handleSongSelection({ trackName, user, guildId, voiceChannelId, messageChannel, sendTrackNotFoundMessage,
    sendTrackAddedMessage, runPaginatedMessage }: HandleSongSelectionOptions) {
    const searchResult = await musicService.loadTracks(`ytsearch:${trackName}`);
    if (!searchResult || searchResult.loadType === 'NO_MATCHES') {
      const errorEmbedMessage = generateErrorMessage(`Could not find the results for **${trackName}**`);
      return sendTrackNotFoundMessage(errorEmbedMessage);
    }
    const paginatedMessage = this.generateSearchResult(user, searchResult.tracks);
    paginatedMessage.setEnableMessageCollector(true);
    paginatedMessage.setMessageCollectorOptions({
      filter: (collected) => {
        const songIndex = Number(collected.content);
        return collected.author.id === user.id && songIndex >= 0 && songIndex <= searchResult.tracks.length;
      },
      run: async ({ handler, message: collected }) => {
        const songIndex = Number(collected.content);
        // Stop selecting if the index value is 0
        let selectResultText = 'Canceled by user.';
        if (songIndex >= 1) {
          const selectedTrack = searchResult.tracks[songIndex - 1];
          const queue = await this.container.queueManager.resolveQueue(guildId, voiceChannelId, messageChannel);
          queue.addTrack(user.id, selectedTrack);
          const embedTrackAdded = this.generateTrackAdded(user, selectedTrack);
          await sendTrackAddedMessage(embedTrackAdded);
          if (!queue.hasCurrentTrack())
            queue.play();
          selectResultText = `Song #${songIndex} has been selected.`;
        }
        handler.setStopInteractionTemplate(
          new EmbedBuilder()
            .setFooter({ text: selectResultText })
        );
        handler.stopAllCollector();
      }
    });
    await runPaginatedMessage(paginatedMessage);
  }

  private generateSearchResult(user: User, tracks: Track[]) {
    const chunkedTrackList = chunk(tracks, 10);
    const paginated = new PaginatedMessage({
      template: {
        embeds: [
          new EmbedBuilder()
            .setColor(EmbedColors.Info)
            .setAuthor({ name: 'Song selection. Type the song number to continue.', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
            .setFooter({ text: 'This timeouts in 1 minute. Type 0 to cancel.' })
        ]
      },
      stopInteractionTemplate: {
        embeds: [
          new EmbedBuilder()
            .setFooter({ text: 'No song was selected.' })
        ]
      },
      actions: [
        {
          customId: '@sapphire/paginated-messages.previousPage',
          style: ButtonStyle.Primary,
          emoji: '◀️',
          type: ComponentType.Button,
          run: ({ handler }) => {
            if (handler.index === 0) {
              handler.index = handler.pages.length - 1;
            } else {
              --handler.index;
            }
          }
        },
        {
          customId: '@sapphire/paginated-messages.nextPage',
          style: ButtonStyle.Primary,
          emoji: '▶️',
          type: ComponentType.Button,
          run: ({ handler }) => {
            if (handler.index === handler.pages.length - 1) {
              handler.index = 0;
            } else {
              ++handler.index;
            }
          }
        },
        {
          customId: 'command/play.stopSearching',
          style: ButtonStyle.Primary,
          emoji: '❌',
          type: ComponentType.Button,
          run: ({ handler }) => {
            (<PaginatedMessage><unknown>handler).setStopInteractionTemplate(
              new EmbedBuilder()
                .setFooter({ text: 'Canceled by user.' })
            );
            (<PaginatedMessage><unknown>handler).stopAllCollector();
          }
        }
      ]
    });
    let trackIndex = 0;
    for (let i = 0; i < chunkedTrackList.length; i++) {
      const trackList = chunkedTrackList[i];
      let content = '';
      for (let j = 0; j < trackList.length; j++) {
        const track = trackList[j];
        content += `**${++trackIndex}.** **[${track.info.title}](${track.info.uri}) (${humanizeTime(track.info.length)})**\n`;
      }
      paginated.addPage({ embeds: [new EmbedBuilder().setDescription(content)] });
    }
    paginated.setIdle(60_000);
    paginated.setStopPaginatedMessageCustomIds(['command/play.stopSearching']);
    return paginated;
  }

  private generateTrackAdded(user: User, track: Track) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Track added to queue', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(`**[${track.info.title}](${track.info.uri}) (${humanizeTime(track.info.length)})**`)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }

  private generatePlaylistAdded(user: User, name: string, url: string, size: number) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Playlist added to queue', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(`**[${name}](${url}) - ${size} song(s)**`)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
