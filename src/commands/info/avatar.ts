import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message, User } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'avatar',
  aliases: ['pfp'],
  fullCategory: ['Information'],
  description: 'Gets a user\'s avatar, can mention multiple users',
  detailedDescription: {
    usage: '[<user 1>] [<user 2>] [<user 3>] [<user 4>]',
    examples: ['', '@user']
  }
})
export class AvatarCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to get avatar from')
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of avatar')
            .setChoices({ name: 'Global', value: 'global' }, { name: 'Server', value: 'server' })
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    if (!message.mentions.members?.size) {
      if (!args.finished) {
        if (!message.guild) {
          return message.channel.send('You must be in a server to get other user\'s  avatar');
        }
        const name = await args.rest('string').then(value => value.toLowerCase());
        const member = await message.guild.members.fetch({ query: name }).then(members => members.first());
        if (!member) {
          const errorEmbedMessage = generateErrorMessage('Could not find the user you are looking for');
          return message.channel.send({ embeds: [errorEmbedMessage] });
        }
        const embed = this.generateAvatar(member);
        return message.channel.send({ embeds: [embed] });
      }
      const embed = this.generateAvatar(message.member || message.author);
      return message.channel.send({ embeds: [embed] });
    }
    await Promise.all(message.mentions.members.map(member => {
      if (!message.channel.isSendable()) return;
      const embed = this.generateAvatar(member);
      return message.channel.send({ embeds: [embed] });
    }));
  }

  public chatInputRun(interaction: ChatInputCommandInteraction) {
    const member = interaction.options.getMember('user');
    const type = <'global' | 'server' | null>interaction.options.getString('type');
    if (member && member instanceof GuildMember) {
      const embed = this.generateAvatar(member, type);
      return interaction.reply({ embeds: [embed] });
    }
    if (interaction.member instanceof GuildMember) {
      const embed = this.generateAvatar(interaction.member || interaction.user, type);
      return interaction.reply({ embeds: [embed] });
    }
  }

  private generateAvatar(member: GuildMember | User, type: 'global' | 'server' | null = null) {
    const tag = member instanceof GuildMember ? member.user.tag : member.tag;
    let avatarUrl;
    if (member instanceof User) {
      avatarUrl = member.displayAvatarURL({ forceStatic: false, extension: 'png', size: 4096 });
    } else if (type === 'global') {
      avatarUrl = member.user.displayAvatarURL({ forceStatic: false, extension: 'png', size: 4096 });
    } else {
      avatarUrl = member.displayAvatarURL({ forceStatic: false, extension: 'png', size: 4096 });
    }
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setTitle(tag)
      .setImage(avatarUrl);
  }
}
