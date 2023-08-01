import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'stop',
  aliases: ['disconnect', 'dc'],
  fullCategory: ['Music'],
  description: 'Stop playing music and clear the queue',
  detailedDescription: {},
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class StopCommand extends Command {
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
    await queue.disconnect({ sendEmptyQueueMessage: false });
    const embed = this.generatePlayerStopped(message.author);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    await queue.disconnect({ sendEmptyQueueMessage: false });
    const embed = this.generatePlayerStopped(interaction.user);
    return interaction.reply({ embeds: [embed] });
  }

  private generatePlayerStopped(user: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player stopped', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription('The bot has disconnected from the voice channel')
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
