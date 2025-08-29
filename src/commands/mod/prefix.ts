import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Guild, Message, PermissionsBitField } from 'discord.js';

import { Guild as GuildModel } from '../../models';
import { guildService } from '../../services';
import { EmbedColors } from '../../common/enums';
import { DEFAULT_PREFIX, OWNER_ID } from '../../config';

@ApplyOptions<Command.Options>({
  name: 'prefix',
  aliases: ['setprefix'],
  fullCategory: ['Moderation'],
  description: 'Change the current bot\'s prefix in this server',
  detailedDescription: {
    usage: '[<new prefix>]',
    examples: ['', '+', '?']
  },
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class PrefixCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('prefix')
            .setDescription('Set new prefix')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) return;
    if (args.finished) {
      if (!message.channel.isSendable()) return;
      const cfg = await guildService.findOrCreateGuildConfig(message.guild.id, { cache: true, instanceId: this.container.alterInstanceId });
      const embed = this.generatePrefixMessage(message.guild, cfg);
      return message.channel.send({ embeds: [embed] });
    }
    if (!message.member?.permissions.has(PermissionsBitField.Flags.ManageGuild) && message.author.id !== OWNER_ID) {
      if (!message.channel.isSendable()) return;
      const embed = this.generateErrorMessage(message.guild);
      return message.channel.send({ embeds: [embed] });
    }
    const prefix = await args.pick('string');
    await guildService.setBotPrefix(message.guild.id, prefix, this.container.alterInstanceId);
    const embed = this.generateSuccessMessage(prefix, message.guild);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const prefix = interaction.options.getString('prefix');
    if (!prefix) {
      const cfg = await guildService.findOrCreateGuildConfig(interaction.guild.id, { cache: true, instanceId: this.container.alterInstanceId });
      const embed = this.generatePrefixMessage(interaction.guild, cfg);
      return interaction.reply({ embeds: [embed] });
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild) && interaction.user.id !== OWNER_ID) {
      const embed = this.generateErrorMessage(interaction.guild);
      return interaction.reply({ embeds: [embed] });
    }
    await interaction.deferReply();
    await guildService.setBotPrefix(interaction.guild.id, prefix, this.container.alterInstanceId);
    const embed = this.generateSuccessMessage(prefix, interaction.guild);
    return interaction.followUp({ embeds: [embed] });
  }

  private generatePrefixMessage(guild: Guild, cfg: GuildModel | null) {
    const prefix = cfg ? cfg.prefix : DEFAULT_PREFIX;
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setDescription(`The current prefix is \`${prefix}\`.`);
  }

  private generateSuccessMessage(prefix: string, guild: Guild) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setDescription(`Prefix has been changed to \`${prefix}\`.`);
  }

  private generateErrorMessage(guild: Guild) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Error)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setDescription('You need `Manage Server` permission to use this command');
  }
}
