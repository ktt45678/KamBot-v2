import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'antigodit',
  aliases: ['goditshield'],
  fullCategory: ['Fun'],
  description: 'Apply godit shield for yourself (1 time, 30 minutes)',
  detailedDescription: {}
})
export class AntiGoditCommand extends Command {
  public async messageRun(message: Message) {
    const ttl = await funService.ttlGoditShield(message.author.id);
    if (ttl > 0) {
      const embed = this.generateGoditShieldInfo(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    await funService.createGoditShield(message.author.id);
    return message.react('1132359730711494657');
  }

  private generateGoditShieldInfo(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author.toString()}'s <:invincible:1132359730711494657> will expire in ${cooldown}`);
  }
}
