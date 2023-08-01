import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'removedebuffs',
  aliases: ['debuffclear', 'rmdebuffs'],
  fullCategory: ['Fun'],
  description: 'Remove all debuffs on someone (2h cooldown)',
  detailedDescription: {
    usage: '<user>',
    examples: ['@user']
  }
})
export class RemoveDebuffsCommand extends Command {
  public async messageRun(message: Message) {
    if (!message.mentions.users.size) {
      const embed = generateErrorMessage('Please mention a user', 'Failed to use');
      return message.channel.send({ embeds: [embed] });
    }
    const target = message.mentions.users.first()!;
    if (target.bot) {
      const embed = generateErrorMessage('You cannot use this on a bot', 'Failed to use');
      return message.channel.send({ embeds: [embed] });
    }
    if (target.id === message.author.id) {
      const embed = generateErrorMessage('You cannot use this on yourself', 'Failed to use');
      return message.channel.send({ embeds: [embed] });
    }
    const ttl = await funService.ttlRemoveDebuffsCooldown(message.author.id);
    if (ttl > 0) {
      const embed = this.generateRemoveDebuffsCD(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    await Promise.all([
      funService.removeDebuffs(target.id),
      funService.createRemoveDebuffsCooldown(message.author.id)
    ]);
    return message.react('1132359736768090194');
  }

  private generateRemoveDebuffsCD(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author.toString()} <:removedebuffs:1132359736768090194> cooldown: ${cooldown}`);
  }
}
