import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'debuffresistance',
  aliases: ['debuffresist', 'antidebuff', 'resistanceup'],
  fullCategory: ['Fun'],
  description: 'Increase debuff resistance for yourself or someone by 15% for 5h (2h cooldown, stackable)',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  }
})
export class DebuffResistanceCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    const key = await args.pick('string').catch(() => null);
    if (key === 'status') {
      const allBuffs = await this.countDebuffResist(message.author.id);
      const embed = this.generateDebuffResistInfo(message.author, allBuffs);
      return message.channel.send({ embeds: [embed] });
    }
    const ttl = await funService.ttlDebuffResistCooldown(message.author.id);
    if (ttl > 0) {
      const embed = this.generateDebuffResistCD(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    if (!message.mentions.users.size) {
      await this.applyDebuffResist(message.author.id);
    } else {
      const target = message.mentions.users.first()!;
      if (target.bot) {
        const embed = generateErrorMessage('You cannot use this on a bot', 'Failed to use');
        return message.channel.send({ embeds: [embed] });
      }
      await this.applyDebuffResist(target.id);
    }
    await funService.createDebuffResistCooldown(message.author.id);
    return message.react('1132359722549399552');
  }

  private generateDebuffResistCD(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author} <:debuffresistup:1132359722549399552> cooldown: ${cooldown}`);
  }

  private generateDebuffResistInfo(author: User, buffs: number[]) {
    const rate = buffs.length ? buffs.length * 15 : 0;
    let message = `Resistance: ${rate}%\n`;
    for (let i = 0; i < buffs.length; i++) {
      const cooldown = Duration.fromObject({ seconds: buffs[i] }).toFormat('hh:mm:ss');
      message += `<:debuffresistup:1132359722549399552> slot ${i + 1}: ${cooldown}\n`;
    }

    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setDescription(message);
  }

  private async applyDebuffResist(id: string) {
    const counter = Number(await funService.findDebuffResistCounter(id));
    const nextCount = !isNaN(counter) ? counter + 1 : 1;
    await Promise.all([
      funService.createDebuffResist(id, nextCount - 1),
      funService.createDebuffResistCounter(id, nextCount)
    ]);
  }

  private async countDebuffResist(id: string) {
    const counter = await funService.findDebuffResistCounter(id).then(value => value || 0);
    const iterator = Array.from({ length: counter }, (_, i) => i)
    const allBuffs = await Promise.all(iterator.map(index => funService.ttlDebuffResist(id, index)));
    const results = allBuffs.filter(b => b > 0);
    return results;
  }
}
