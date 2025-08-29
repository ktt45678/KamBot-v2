import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';
import { findMemberInGuild, generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'alter',
  fullCategory: ['Fun'],
  description: 'IDK (1 time, 30 minutes)',
  detailedDescription: {}
})
export class AlterCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    const ttl = await funService.ttlAlterCD(message.author.id);
    if (ttl > 0) {
      if (!message.channel.isSendable()) return;
      const embed = this.generateAlterCDEmbed(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    let targetId;
    if (message.mentions.users.size) {
      const firstMention = message.mentions.users.first()!;
      if (firstMention.bot) {
        if (!message.channel.isSendable()) return;
        const embed = generateErrorMessage('You cannot use this on a bot', 'Failed to alter');
        return message.channel.send({ embeds: [embed] });
      }
      targetId = firstMention.id;
    } else if (!args.finished && message.inGuild()) {
      const findMemberName = await args.rest('string');
      const foundMember = await findMemberInGuild(message.guild.members, findMemberName);
      if (!foundMember) {
        if (!message.channel.isSendable()) return;
        const embed = generateErrorMessage('Could not find the user you are looking for');
        return message.channel.send({ embeds: [embed] });
      } else if (foundMember.user.bot) {
        if (!message.channel.isSendable()) return;
        const embed = generateErrorMessage('You cannot use this on a bot', 'Failed to alter');
        return message.channel.send({ embeds: [embed] });
      }
      targetId = foundMember.id;
    } else {
      if (!message.channel.isSendable()) return;
      const embed = generateErrorMessage('Please mention a user');
      return message.channel.send({ embeds: [embed] });
    }
    await Promise.all([
      funService.createAlter(message.author.id, targetId),
      funService.createAlterCD(message.author.id)
    ]);
    return message.react('✅');
  }

  private generateAlterCDEmbed(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author.toString()} cooldown: ${cooldown}`);
  }
}
