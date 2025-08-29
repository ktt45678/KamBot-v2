import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';
import { DateTime } from 'luxon';

import { userService } from '../../services/user';
import { ClaimDailyResult } from '../../common/interfaces/user';
import { EmbedColors } from '../../common/enums';
import { findMemberInGuild, generateErrorMessage } from '../../common/utils';
import { DailyConfig } from '../../common/configs';

@ApplyOptions<Command.Options>({
  name: 'daily',
  fullCategory: ['User'],
  description: 'Get your daily rewards, can be used to give another user',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  }
})
export class DailyCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Give rewards to a user')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    const authorDaily = await userService.findDaily(message.author.id);
    if (authorDaily?.claimedAt && DateTime.fromJSDate(authorDaily.claimedAt).toUTC().toISODate() === DateTime.now().toUTC().toISODate()) {
      if (!message.channel.isSendable()) return;
      const embed = this.generateDailyClaimedMessage();
      return message.channel.send({ embeds: [embed] });
    }
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
      if (!message.channel.isSendable()) return;
      const embed = generateErrorMessage('You can\'t give your daily to a bot.', 'Unable to give daily!');
      return message.channel.send({ embeds: [embed] });
    }
    const daily = await userService.claimDailyReward(targetUser.id, message.author.id, authorDaily);
    if (!message.channel.isSendable()) return;
    const embed = this.generateDailyMessage(daily, targetUser, message.author);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const authorDaily = await userService.findDaily(interaction.user.id);
    if (authorDaily?.claimedAt && DateTime.fromJSDate(authorDaily.claimedAt).toUTC().toISODate() === DateTime.now().toUTC().toISODate()) {
      const embed = this.generateDailyClaimedMessage();
      return interaction.followUp({ embeds: [embed] });
    }
    let targetUser = interaction.options.getUser('user');
    if (!targetUser)
      targetUser = interaction.user;
    if (targetUser.bot) {
      const embed = generateErrorMessage('You can\'t give your daily to a bot.', 'Unable to give daily!');
      return interaction.followUp({ embeds: [embed] });
    }
    const daily = await userService.claimDailyReward(targetUser.id, interaction.user.id, authorDaily);
    const embed = this.generateDailyMessage(daily, targetUser, interaction.user);
    return interaction.followUp({ embeds: [embed] });
  }

  private generateDailyMessage(daily: ClaimDailyResult, targetUser: User, author: User) {
    var description = '';
    if (targetUser.id === author.id) {
      description += `+${daily.xb} xb - ${author}`;
    } else {
      description += `+${daily.targetXb} xb - ${targetUser}`;
    }
    if (daily.streak === DailyConfig.MaxStreak) {
      description += `\n(streak) +${daily.token} token - ${author}`;
      description += `\n(bonus) +${daily.streakXb} xb - ${author}`;
      description += `\n\n**Current streak**\nStreak completed!`;
    } else {
      description += `\n\n**Current streak**\n${daily.streak}/${DailyConfig.MaxStreak}`;
    }
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setTitle('Claimed daily!')
      .setDescription(description)
      .setFooter({ text: 'Dailies reset at 00:00 UTC' });
  }

  private generateDailyClaimedMessage() {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setTitle('You have already claimed your daily!')
      .setDescription('*You can only claim dailies once every 24 hours. Please try again tomorrow!*')
      .setFooter({ text: 'Dailies reset at 00:00 UTC' });
  }
}
