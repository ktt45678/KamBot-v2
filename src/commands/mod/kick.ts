import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { findMemberInGuild, generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'kick',
  fullCategory: ['Moderation'],
  description: 'Kick a user from server',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  },
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class KickCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Kick a user')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) return;
    if (!args.finished && !message.mentions.users.size) {
      const name = await args.rest('string');
      const member = await findMemberInGuild(message.guild.members, name);
      if (!member) {
        const errorEmbedMessage = generateErrorMessage('Could not find the user you are looking for');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
      const embed = this.generateKickMessage(member);
      return message.channel.send({ embeds: [embed] });
    }
    const member = await message.guild.members.fetch(message.mentions.users.first()?.id || message.author.id);
    const embed = this.generateKickMessage(member);
    return message.channel.send({ embeds: [embed] });
  }

  public chatInputRun(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('user');
    if (member && member instanceof GuildMember) {
      const embed = this.generateKickMessage(member)
      return interaction.reply({ embeds: [embed] });
    }
    if (interaction.member instanceof GuildMember) {
      const embed = this.generateKickMessage(interaction.member);
      return interaction.reply({ embeds: [embed] });
    }
  }

  private generateKickMessage(member: GuildMember) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setTitle('User kicked')
      .addFields(
        { name: 'Username', value: member.user.username, inline: true },
        { name: 'ID', value: member.user.id, inline: true }
      );
  }
}
