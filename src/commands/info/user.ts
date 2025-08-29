import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { findMemberInGuild, generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'user',
  aliases: ['whois', 'info'],
  fullCategory: ['Information'],
  description: 'Shows info about a user. If no user is given, your info will be displayed',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  },
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to get info')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    if (!message.inGuild()) return;
    if (!args.finished && !message.mentions.users.size) {
      const name = await args.rest('string').then(value => value.toLowerCase());
      const member = await findMemberInGuild(message.guild.members, name);
      if (!member) {
        const errorEmbedMessage = generateErrorMessage('Could not find the user you are looking for');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
      const embed = this.generateInfo(member);
      return message.channel.send({ embeds: [embed] });
    }
    const firstMention = message.mentions.users.first();
    const member = firstMention ? await message.guild.members.fetch(firstMention.id) : message.member!;
    const embed = this.generateInfo(member);
    return message.channel.send({ embeds: [embed] });
  }

  public chatInputRun(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('user');
    if (member && member instanceof GuildMember) {
      const embed = this.generateInfo(member)
      return interaction.reply({ embeds: [embed] });
    }
    if (interaction.member instanceof GuildMember) {
      const embed = this.generateInfo(interaction.member);
      return interaction.reply({ embeds: [embed] });
    }
  }

  private generateInfo(member: GuildMember) {
    const accountCreated = `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}>`;
    const joinDate = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}>` : 'Unknown';
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 128 }))
      .addFields(
        { name: 'ID', value: member.id, inline: true },
        { name: 'Username', value: member.user.username, inline: true },
        { name: 'Server nickname', value: member.nickname || 'None', inline: false },
        { name: 'Account Created', value: accountCreated, inline: false },
        { name: 'Join Date', value: joinDate, inline: false },
        { name: 'Roles', value: [...member.roles.cache.values()].join(' '), inline: false }
      );
  }
}
