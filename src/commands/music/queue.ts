import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, Message, User } from 'discord.js';
import { chunk } from 'lodash';

import { UserTrack } from '../../modules';
import { EmbedColors } from '../../common/enums';
import { PaginatedMessage, generateErrorMessage, generateInfoMessage, humanizeTime } from '../../common/utils';

@ApplyOptions<Subcommand.Options>({
  name: 'queue',
  fullCategory: ['Music'],
  description: 'Show list of tracks in the queue',
  detailedDescription: {},
  preconditions: ['MusicBot'],
  subcommands: [
    { name: 'list', messageRun: 'messageRunList', chatInputRun: 'chatInputRunList', default: true },
    { name: 'remove', messageRun: 'messageRunRemoveTrack', chatInputRun: 'chatInputRunRemoveTrack' },
    { name: 'clear', messageRun: 'messageRunClearQueue', chatInputRun: 'chatInputRunClearQueue' }
  ],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class QueueCommand extends Subcommand {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand(command =>
          command
            .setName('list')
            .setDescription('Show list of tracks in the queue')
        )
        .addSubcommand(command =>
          command
            .setName('remove')
            .setDescription('Remove a track from the queue')
            .addIntegerOption(option =>
              option
                .setName('position')
                .setDescription('Remove track at the given position')
                .setRequired(true)
                .setMinValue(1)
            )
        )
        .addSubcommand(command =>
          command
            .setName('clear')
            .setDescription('Clear all tracks in the queue')
        )
    );
  }

  public messageRunList(message: Message) {
    if (!message.inGuild()) return;
    const queue = this.container.queueManager.findQueue(message.guildId);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const allTracks = [...queue.tracks];
    queue.current && allTracks.unshift(queue.current);
    if (!allTracks.length) {
      const infoEmbedMessage = generateInfoMessage('The queue in currently empty');
      return message.channel.send({ embeds: [infoEmbedMessage] });
    }
    const paginaedMessage = this.generateTrackList(message.author, allTracks, queue.current);
    return paginaedMessage.run(message);
  }

  public async messageRunRemoveTrack(message: Message, args: Args) {
    if (!message.inGuild()) return;
    const queue = this.container.queueManager.findQueue(message.guildId);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const trackIndex = await args.pick('integer').then(value => value - (queue.current ? 2 : 1)).catch(() => null);
    if (trackIndex === null) {
      const errorEmbedMessage = generateErrorMessage('Please enter the track position');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    // -1 will be the current playing track so keep it
    if (trackIndex < -1) {
      const errorEmbedMessage = generateErrorMessage('Track position must be greater than or equal to 1');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    let removedTrack: UserTrack;
    if (trackIndex === -1 && queue.current) {
      queue.skip();
      removedTrack = queue.current;
    } else {
      if (!queue.tracks.length || !queue.tracks[trackIndex]) {
        const errorEmbedMessage = generateErrorMessage('Could not find the track at the given position');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
      [removedTrack] = queue.tracks.splice(trackIndex, 1);
    }
    const embed = this.generateTrackRemoved(message.author, removedTrack);
    return message.channel.send({ embeds: [embed] });
  }

  public async messageRunClearQueue(message: Message) {
    if (!message.inGuild()) return;
    const queue = this.container.queueManager.findQueue(message.guildId);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    queue.tracks = [];
    const embed = this.generateQueueCleared(message.author);
    return message.channel.send({ embeds: [embed] });
  }

  public chatInputRunList(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const allTracks = [...queue.tracks];
    queue.current && allTracks.unshift(queue.current);
    if (!allTracks.length) {
      const infoEmbedMessage = generateInfoMessage('The queue in currently empty');
      return interaction.reply({ embeds: [infoEmbedMessage] });
    }
    const paginaedMessage = this.generateTrackList(interaction.user, allTracks, queue.current);
    return paginaedMessage.run(interaction);
  }

  public chatInputRunRemoveTrack(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const trackIndex = interaction.options.getInteger('position', true) - (queue.current ? 2 : 1);
    let removedTrack: UserTrack;
    if (trackIndex === -1 && queue.current) {
      queue.skip();
      removedTrack = queue.current;
    } else {
      if (!queue.tracks.length || !queue.tracks[trackIndex]) {
        const errorEmbedMessage = generateErrorMessage('Could not find the track at the given position');
        return interaction.reply({ embeds: [errorEmbedMessage] });
      }
      [removedTrack] = queue.tracks.splice(trackIndex, 1);
    }
    const embed = this.generateTrackRemoved(interaction.user, removedTrack);
    return interaction.reply({ embeds: [embed] });
  }

  public chatInputRunClearQueue(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    queue.tracks = [];
    const embed = this.generateQueueCleared(interaction.user);
    return interaction.reply({ embeds: [embed] });
  }

  private generateTrackList(user: User, tracks: UserTrack[], current: UserTrack | null) {
    const chunkedTrackList = chunk(tracks, 10);
    const paginated = new PaginatedMessage({
      template: {
        embeds: [
          new EmbedBuilder()
            .setColor(EmbedColors.Info)
            .setAuthor({ name: 'Queue info.', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
            .setFooter({ text: 'You can use other commands to make changes to the queue.' })
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
          customId: 'command/queue.stopNavigating',
          style: ButtonStyle.Primary,
          emoji: '❌',
          type: ComponentType.Button,
          run: ({ handler }) => {
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
        content += `**${++trackIndex}.** **[${track.trackData.info.title}](${track.trackData.info.uri}) (${humanizeTime(track.trackData.info.length)})**`;
        if (track === current)
          content += ' • ▶️ **Now playing**';
        content += '\n';
      }
      paginated.addPage({ embeds: [new EmbedBuilder().setDescription(content)] });
    }
    paginated.setIdle(60_000);
    paginated.setStopPaginatedMessageCustomIds(['command/queue.stopNavigating']);
    return paginated;
  }

  private generateTrackRemoved(user: User, track: UserTrack) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Track removed', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(`**[${track.trackData.info.title}](${track.trackData.info.uri}) (${humanizeTime(track.trackData.info.length)})**`)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }

  private generateQueueCleared(user: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Queue cleared', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription('All tracks have been removed')
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
