import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { MusicQueue, RepeatMode } from '../../modules';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage, generateInfoMessage, humanizeTime } from '../../common/utils';

@ApplyOptions<Subcommand.Options>({
  name: 'nowplaying',
  aliases: ['playing', 'nowplay'],
  fullCategory: ['Music'],
  description: 'Show info of the current song.',
  detailedDescription: {},
  preconditions: ['MusicBot'],
  subcommands: [
    { name: 'playing', messageRun: 'messageRunPlaying', chatInputRun: 'chatInputRunPlaying', default: true }
  ],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class NowPlayingCommand extends Subcommand {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName('now')
        .setDescription(this.description)
        .addSubcommand(command =>
          command
            .setName('playing')
            .setDescription(this.description)
        )
    );
  }

  public async messageRunPlaying(message: Message, args: Args) {
    if (!message.inGuild()) return;
    const queue = this.container.queueManager.findQueue(message.guildId);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    if (!queue.current) {
      const infoEmbedMessage = generateInfoMessage('There is no song playing');
      return message.channel.send({ embeds: [infoEmbedMessage] });
    }
    const embed = this.generateCurrentTrack(message.author, queue);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRunPlaying(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    if (!queue.current) {
      const infoEmbedMessage = generateInfoMessage('There is no song playing');
      return interaction.reply({ embeds: [infoEmbedMessage] });
    }
    const embed = this.generateCurrentTrack(interaction.user, queue);
    return interaction.reply({ embeds: [embed] });
  }

  private generateCurrentTrack(user: User, queue: MusicQueue) {
    const trackLength = humanizeTime(queue.current!.trackData.info.length);
    const currentPosition = humanizeTime(queue.player!.position);
    const progressBar = `${currentPosition}/${trackLength}`;
    const nextTrack = queue.tracks.length ? `[${queue.tracks[0].trackData.info.title}](${queue.tracks[0].trackData.info.uri}) (${humanizeTime(queue.tracks[0].trackData.info.length)})` : 'None';
    const thumbnailUrl = `https://i.ytimg.com/vi/${queue.current!.trackData.info.identifier}/hqdefault.jpg`;
    const loop = queue.repeat === RepeatMode.Off ? 'Off' : queue.repeat === RepeatMode.All ? 'All tracks' : 'Current track';
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Now playing', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setThumbnail(thumbnailUrl)
      .setDescription(`**[${queue.current!.trackData.info.title}](${queue.current!.trackData.info.uri}) (${trackLength})**
      \n${progressBar}
      \nLoop: **${loop}**
      Next song: **${nextTrack}**`)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
