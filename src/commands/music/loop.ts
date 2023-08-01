import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { RepeatMode } from '../../modules';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'loop',
  aliases: ['repeat', 'rp'],
  fullCategory: ['Music'],
  description: 'Loop the current track or the queue.',
  detailedDescription: {
    usage: '<[off | one | all]>',
    examples: ['', 'off', 'one']
  },
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class LoopCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('mode')
            .setDescription('Set repeat mode')
            .setChoices(
              { name: 'Off', value: 'off' },
              { name: 'One', value: 'one' },
              { name: 'All', value: 'all' }
            )
            .setRequired(true)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) return;
    const queue = this.container.queueManager.findQueue(message.guildId);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const mode = await args.pick('string').catch(() => null);
    if (mode && !['off', 'one', 'all'].includes(mode)) {
      const errorEmbedMessage = generateErrorMessage('Mode must be `off`, `one` or `all`');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const resolvedMode = this.resolveRepeatMode(mode, queue.getRepeat());
    queue.setRepeat(resolvedMode);
    const embed = this.generateRepeatModeChanged(message.author, resolvedMode);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const mode = interaction.options.getString('mode', true);
    const resolvedMode = this.resolveRepeatMode(mode, queue.getRepeat());
    queue.setRepeat(resolvedMode);
    const embed = this.generateRepeatModeChanged(interaction.user, resolvedMode);
    return interaction.reply({ embeds: [embed] });
  }

  private resolveRepeatMode(mode: string | null, currentMode: RepeatMode) {
    switch (mode) {
      case 'off':
        return RepeatMode.Off;
      case 'one':
        return RepeatMode.Once;
      case 'all':
        return RepeatMode.All;
      default:
        return currentMode === RepeatMode.Off ? RepeatMode.All : RepeatMode.Off;
    }
  }

  private generateRepeatModeChanged(user: User, mode: RepeatMode) {
    const content = mode === RepeatMode.Off ? 'Repeat has been turned off' :
      mode === RepeatMode.All ? 'Now repeating all tracks in the queue' :
        'Now repeating the current track';
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player updated', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(content)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
