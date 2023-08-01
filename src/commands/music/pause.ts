import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'pause',
  fullCategory: ['Music'],
  description: 'Pause or unpause the player.',
  detailedDescription: {},
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class PauseCommand extends Command {
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
    const paused = queue.getPaused();
    queue.setPaused(!paused);
    const embed = !paused ? this.generatePlayerPaused(message.author) : this.generatePlayerResumed(message.author);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const paused = queue.getPaused();
    queue.setPaused(!paused);
    const embed = !paused ? this.generatePlayerPaused(interaction.user) : this.generatePlayerResumed(interaction.user);
    return interaction.reply({ embeds: [embed] });
  }

  private generatePlayerPaused(user: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player paused', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription('Use this command again to unpause')
      .setFooter({ text: `Requested by: ${user.tag}` });
  }

  private generatePlayerResumed(user: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player unpaused', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription('Continue playing the current song')
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
