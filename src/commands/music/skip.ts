import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { UserTrack } from '../../modules';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage, humanizeTime } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'skip',
  aliases: ['nexttrack', 's'],
  fullCategory: ['Music'],
  description: 'Skip the current track',
  detailedDescription: {},
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class SkipCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) return;
    const queue = this.container.queueManager.findQueue(message.guildId);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const currentTrack = queue.current;
    if (!currentTrack) {
      const errorEmbedMessage = generateErrorMessage('There is no song playing');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    queue.skip();
    const embed = this.generateTrackSkipped(message.author, currentTrack, queue.getNextTrack());
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const currentTrack = queue.current;
    if (!currentTrack) {
      const errorEmbedMessage = generateErrorMessage('There is no song playing');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    queue.skip();
    const embed = this.generateTrackSkipped(interaction.user, currentTrack, queue.getNextTrack());
    return interaction.reply({ embeds: [embed] });
  }

  private generateTrackSkipped(user: User, track: UserTrack, nextTrack: UserTrack | null) {
    let content = `**[${track.trackData.info.title}](${track.trackData.info.uri}) (${humanizeTime(track.trackData.info.length)})**`;
    if (nextTrack) {
      content += '\nNow playing:\n';
      content += `**[${nextTrack.trackData.info.title}](${nextTrack.trackData.info.uri}) (${humanizeTime(nextTrack.trackData.info.length)})**`;
    }
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Track skipped', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(content)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
