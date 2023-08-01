import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';

import { Profile } from '../../models';
import { userService } from '../../services/user';
import { EmbedColors } from '../../common/enums';
import { findMemberInGuild, generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'profile',
  fullCategory: ['User'],
  description: 'View yours or someone else\'s profile',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  }
})
export class ProfileCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('View other user\'s profile')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    let targetUser: User | null = null;
    if (message.inGuild() && !args.finished && !message.mentions.users.size) {
      const targetUserName = await args.rest('string').then(value => value.toLowerCase());
      targetUser = await findMemberInGuild(message.guild.members, targetUserName).then(member => member?.user || null);
      if (!targetUser) {
        const errorEmbedMessage = generateErrorMessage('Could not find the user you are looking for');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
    } else if (message.mentions.users.size) {
      targetUser = message.mentions.users.first() || null;
    }
    if (!targetUser)
      targetUser = message.author;
    if (targetUser.bot) {
      const embed = generateErrorMessage('You can\'t use this command on a bot.', 'Unable to view profile!');
      return message.channel.send({ embeds: [embed] });
    }
    const profile = await userService.findProfile(targetUser.id);
    const embed = this.generateInfo(targetUser, profile);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    let targetUser = interaction.options.getUser('user');
    if (!targetUser)
      targetUser = interaction.user;
    if (targetUser.bot) {
      const embed = generateErrorMessage('You can\'t use this command on a bot.', 'Unable to view profile!');
      return interaction.reply({ embeds: [embed] });
    }
    await interaction.deferReply();
    const profile = await userService.findProfile(targetUser.id);
    const embed = this.generateInfo(targetUser, profile);
    return interaction.followUp({ embeds: [embed] });
  }

  private generateInfo(user: User, profile: Profile | null) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: true, size: 64 }) })
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 128 }))
    if (profile) {
      embed.addFields(
        { name: 'Level', value: profile.level.toString(), inline: false },
        { name: 'XB', value: profile.xb.toString(), inline: false },
        { name: 'XP', value: profile.xp.toString(), inline: false },
        { name: 'Token', value: profile.token.toString(), inline: false }
      );
    } else {
      embed.setDescription('*Profile has not been created for this user*');
    }
    return embed;
  }
}
