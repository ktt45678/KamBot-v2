import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'randomeffect',
  aliases: ['rndeffect'],
  fullCategory: ['Fun'],
  description: 'Apply a random effect on yourself (2h cooldown)',
  detailedDescription: {}
})
export class RandomEffectCommand extends Command {
  public async messageRun(message: Message) {
    const ttl = await funService.ttlRandomEffectCD(message.author.id);
    if (ttl > 0) {
      if (!message.channel.isSendable()) return;
      const embed = this.generateRandomEffectCD(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    const [, emote] = await Promise.all([
      funService.createRandomEffectCD(message.author.id),
      funService.createRandomEffect(message.author.id)
    ]);
    return message.react(emote);
  }

  private generateRandomEffectCD(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author} <:removedebuffs:1132359736768090194> cooldown: ${cooldown}`);
  }
}
