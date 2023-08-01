import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'shuffle',
  fullCategory: ['Music'],
  description: 'Shuffle the current music queue',
  detailedDescription: {},
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class ShuffleCommand extends Command {
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
    const shuffle = !queue.getShuffle();
    queue.setShuffle(shuffle);
    const embed = this.generatePlayerShuffleChanged(message.author, shuffle);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const shuffle = !queue.getShuffle();
    queue.setShuffle(shuffle);
    const embed = this.generatePlayerShuffleChanged(interaction.user, shuffle);
    return interaction.reply({ embeds: [embed] });
  }

  private generatePlayerShuffleChanged(user: User, shuffle: boolean) {
    const content = shuffle ? 'Shuffle has been enabled' : 'Shuffle has been disabled';
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player updated', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(content)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
