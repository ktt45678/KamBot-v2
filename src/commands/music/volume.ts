import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'volume',
  fullCategory: ['Music'],
  description: 'Set volume of the current player',
  detailedDescription: {
    usage: '[<0... 200>]',
    examples: ['', '50', '150']
  },
  preconditions: ['MusicBot'],
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class VolumeCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addIntegerOption(option =>
          option
            .setName('volume')
            .setDescription('Set volume number (0 to 200)')
            .setMaxValue(200)
            .setMinValue(0)
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
    const volume = await args.pick('integer').catch(() => null);
    if (!volume) {
      const currentVolume = queue.getVolume();
      const currentVolumeEmbed = this.generateCurrentVolume(message.author, currentVolume);
      return message.channel.send({ embeds: [currentVolumeEmbed] });
    }
    if (volume < 0 || volume > 200) {
      const errorEmbedMessage = generateErrorMessage('Volume must be a number between 0 and 200');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    queue.setVolume(volume / 100);
    const embed = this.generateVolumeChanged(message.author, volume);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const queue = this.container.queueManager.findQueue(interaction.guildId!);
    if (!queue) {
      const errorEmbedMessage = generateErrorMessage('The player is not active');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }
    const volume = interaction.options.getInteger('volume');
    if (!volume) {
      const currentVolume = queue.getVolume() * 100;
      const currentVolumeEmbed = this.generateCurrentVolume(interaction.user, currentVolume);
      return interaction.reply({ embeds: [currentVolumeEmbed] });
    }
    queue.setVolume(volume / 100);
    const embed = this.generateVolumeChanged(interaction.user, volume);
    return interaction.reply({ embeds: [embed] });
  }

  private generateCurrentVolume(user: User, volume: number) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player info', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(`Volume: **${volume}**`)
      .setFooter({ text: 'Type this command with a number to change the volume' });
  }

  private generateVolumeChanged(user: User, volume: number) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Player updated', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(`Volume has been changed to: **${volume}**`)
      .setFooter({ text: `Requested by: ${user.tag}` });
  }
}
