import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'stun',
  fullCategory: ['Fun'],
  description: 'Stun someone for 30 minutes (2h cooldown)',
  detailedDescription: {
    usage: '<user>',
    examples: ['@user']
  }
})
export class StunCommand extends Command {
  public async messageRun(message: Message) {
    if (!message.mentions.users.size) {
      const embed = generateErrorMessage('Please mention a user', 'Failed to stun');
      return message.channel.send({ embeds: [embed] });
    }
    const target = message.mentions.users.first()!;
    if (target.bot) {
      const embed = generateErrorMessage('Bots are immune to this', 'Failed to stun');
      return message.channel.send({ embeds: [embed] });
    }
    const ttl = await funService.ttlStunCooldown(message.author.id);
    if (ttl > 0) {
      const embed = this.generateStunCooldown(message.author, ttl);
      return message.channel.send({ embeds: [embed] });
    }
    const [resistList, immune] = await Promise.all([
      this.countDebuffResist(target.id),
      funService.findDebuffImmune(target.id)
    ]);
    immune && funService.delDebuffImmune(target.id);
    const resistRate = resistList.length * 15;
    const resistChance = resistRate - (Math.random() * 100);
    if (!isNaN(resistChance) && resistChance < 0 && !immune) {
      await Promise.all([
        funService.createGoditStun(target.id),
        funService.createStunCooldown(message.author.id)
      ]);
      return message.react('1132359742770122943');
    }
    await funService.createStunCooldown(message.author.id);
    const embed = this.generateStunResist(target);
    return message.channel.send({ embeds: [embed] });
  }

  private generateStunCooldown(author: User, ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Warning)
      .setDescription(`${author.toString()} <:stunskill:1132359742770122943> cooldown: ${cooldown}`);
  }

  private generateStunResist(target: User) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setDescription(`${target} miss`)
  }

  private async countDebuffResist(id: string) {
    const counter = await funService.findDebuffResistCounter(id).then(value => value || 0);
    const iterator = Array.from({ length: counter }, (_, i) => i)
    const allBuffs = await Promise.all(iterator.map(index => funService.ttlDebuffResist(id, index)));
    const results = allBuffs.filter(b => b > 0);
    return results;
  }
}
