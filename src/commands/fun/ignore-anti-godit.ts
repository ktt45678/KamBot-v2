import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'ignoreantigodit',
  aliases: ['ignoregoditshield'],
  fullCategory: ['Fun'],
  description: 'Apply ignore anti-godit to yourself for 30 minutes (1 time, 2h cooldown)',
  detailedDescription: {}
})
export class IgnoreAntiGoditCommand extends Command {
  public async messageRun(message: Message) {
    const ttl = await funService.ttlIgnoreGoditShieldCD(message.author.id);
    if (ttl > 0) {
      const embed = this.generateIgnoreAntiGoditCD(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    await Promise.all([
      funService.createIgnoreGoditShield(message.author.id),
      funService.createIgnoreGoditShieldCD(message.author.id)
    ]);
    return message.react('1132359726416547960');
  }

  private generateIgnoreAntiGoditCD(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author.toString()} <:ignoreinvincible:1132359726416547960> cooldown: ${cooldown}`);
  }
}
