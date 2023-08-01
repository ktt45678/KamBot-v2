import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, Collection, EmbedBuilder, GuildMember, Message, User } from 'discord.js';
import { Duration } from 'luxon';

import { GifImage, gifImageModel } from '../../models';
import { funService } from '../../services/fun';
import { EmbedColors } from '../../common/enums';
import { GODIT_BLACKLIST, GODIT_BLACKLIST_MESSAGES, GODIT_RATE } from '../../config';

@ApplyOptions<Command.Options>({
  name: 'godit',
  aliases: ['danhdit'],
  fullCategory: ['Fun'],
  description: 'Godit anyone',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  }
})
export class GoditCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Godit a user')
            .setRequired(false)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    const ttl = await funService.ttlGoditStun(message.author.id);
    if (ttl > 0) {
      const embed = this.generateStunInfo(ttl);
      return message.channel.send({ embeds: [embed] });
    }
    if (GODIT_RATE - Math.random() < 0) {
      const embed = this.generateGoditFailedInfo();
      return message.channel.send({ embeds: [embed] });
    }
    let author = message.author;
    let target = await args.rest('string').catch(() => '');
    if (message.mentions.users.size) {
      const shielder = await this.checkShield(message.mentions.users);
      if (shielder) {
        const ignoreShield = await funService.findIgnoreGoditShield(message.author.id);
        if (!ignoreShield) {
          await funService.delGoditShield(shielder.id);
          const [resistList, immune] = await Promise.all([
            this.countDebuffResist(message.author.id),
            funService.findDebuffImmune(message.author.id)
          ]);
          immune && funService.delDebuffImmune(message.author.id);
          const resistRate = resistList.length * 15;
          const resistChance = resistRate - (Math.random() * 100);
          if (!isNaN(resistChance) && resistChance < 0 && !immune) {
            await funService.createGoditStun(message.author.id);
            const embed = this.generateStunMessage(message.author, shielder);
            return message.channel.send({ embeds: [embed] });
          }
          const embed = this.generateStunMessage(message.author, shielder, false);
          return message.channel.send({ embeds: [embed] });
        }
        await funService.delIgnoreGoditShield(message.author.id);
      }
      if (message.inGuild()) {
        const blacklistIndex = this.checkBlacklist(message.mentions.members, GODIT_BLACKLIST);
        if (typeof blacklistIndex === 'number') {
          const embed = this.generateGoditBlacklistStunMessage(message.author, GODIT_BLACKLIST_MESSAGES[blacklistIndex] || 'thích');
          await Promise.all([
            funService.createGoditStun(message.author.id, 300),
            message.channel.send({ embeds: [embed] })
          ]);
        }
        const alterData = await this.checkAlter(message.mentions.users);
        if (alterData) {
          target = await message.guild.members.fetch(alterData.alterId).then(member => member.user.toString());
          await funService.delAlter(alterData.realUser.id);
        }
        const pretenderId = await funService.findPretend(author.id);
        if (pretenderId) {
          const [authorMember] = await Promise.all([
            message.guild.members.fetch(pretenderId),
            funService.delPretend(author.id)
          ]);
          author = authorMember.user;
        }
      }
    }
    const gif = await gifImageModel.findOneRandomGif(this.name);
    const embed = this.generateGoditMessage(gif, author, target);
    return message.channel.send({ content: `${target} ${gif.comment}`, embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const ttl = await funService.ttlGoditStun(interaction.user.id);
    if (ttl > 0) {
      const embed = this.generateStunInfo(ttl);
      return interaction.reply({ embeds: [embed] });
    }
    if (GODIT_RATE - Math.random() < 0) {
      const embed = this.generateGoditFailedInfo();
      return interaction.reply({ embeds: [embed] });
    }
    await interaction.deferReply();
    let author = interaction.user;
    let target = interaction.options.getUser('user');
    if (target) {
      const shielder = await this.checkShieldOne(target);
      if (shielder) {
        const ignoreShield = await funService.findIgnoreGoditShield(author.id);
        if (!ignoreShield) {
          await funService.delGoditShield(target.id);
          const [resistList, immune] = await Promise.all([
            this.countDebuffResist(author.id),
            funService.findDebuffImmune(author.id)
          ]);
          immune && funService.delDebuffImmune(author.id);
          const resistRate = resistList.length * 15;
          const resistChance = resistRate - (Math.random() * 100);
          if (!isNaN(resistChance) && resistChance < 0 && !immune) {
            await funService.createGoditStun(author.id);
            const embed = this.generateStunMessage(author, target);
            return interaction.followUp({ embeds: [embed] });
          }
          const embed = this.generateStunMessage(author, target, false);
          return interaction.followUp({ embeds: [embed] });
        }
        await funService.delIgnoreGoditShield(author.id);
      }
      if (interaction.inGuild()) {
        let targetMember = interaction.options.getMember('user');
        if (!(targetMember instanceof GuildMember))
          targetMember = await interaction.guild!.members.fetch(target.id);
        const blacklistIndex = this.checkBlacklistOne(targetMember, GODIT_BLACKLIST);
        if (typeof blacklistIndex === 'number') {
          const embed = this.generateGoditBlacklistStunMessage(author, GODIT_BLACKLIST_MESSAGES[blacklistIndex] || 'thích');
          await Promise.all([
            funService.createGoditStun(author.id, 300),
            interaction.followUp({ embeds: [embed] })
          ]);
        }
        const alterData = await this.checkAlterOne(target);
        if (alterData) {
          target = await interaction.guild!.members.fetch(alterData.alterId).then(member => member.user);
          await funService.delAlter(alterData.realUser.id);
        }
        const pretenderId = await funService.findPretend(author.id);
        if (pretenderId) {
          const [authorMember] = await Promise.all([
            interaction.guild!.members.fetch(pretenderId),
            funService.delPretend(author.id)
          ]);
          author = authorMember.user;
        }
      }
    }
    const gif = await gifImageModel.findOneRandomGif(this.name);
    const targetString = target?.toString() || '';
    const embed = this.generateGoditMessage(gif, author, targetString);
    return interaction.followUp({ content: `${targetString} ${gif.comment}`, embeds: [embed] });
  }

  private generateGoditMessage(gif: GifImage, author: User, target: string) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setImage(gif.url);
    if (target)
      embed.setDescription(`${target} vừa bị ${author} đánh đít`)
    return embed;
  }

  private generateStunMessage(author: User, target: User, stunned: boolean = true) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info);
    if (stunned)
      embed.setDescription(`${target} kích hoạt <:Buff_Icon_Invul:876858880875954216>, ${author} bị stun trong 30 phút`)
    else
      embed.setDescription(`${target} kích hoạt <:Buff_Icon_Invul:876858880875954216>, ${author} kháng stun thành công`)
    return embed;
  }

  private generateStunInfo(ttl: number) {
    const cooldown = Duration.fromObject({ seconds: ttl }).toFormat('hh:mm:ss');
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setDescription(`Bạn đang bị stun, thử lại sau ${cooldown}`);
  }

  private generateGoditFailedInfo() {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setDescription('Lười rồi, không gõ đít nữa');
  }

  private generateGoditBlacklistStunMessage(author: User, reason: string) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setDescription(`${author} bị stun trong 5 phút vì ${reason}`);
  }

  private async checkShieldOne(user: User) {
    return funService.findGoditShield(user.id).then(value => !!value);
  }

  private async checkShield(users: Collection<string, User>) {
    const array = users.toJSON();
    for (let i = 0; i < array.length; i++) {
      const shield = await this.checkShieldOne(array[i]);
      if (shield)
        return array[i];
    }
    return null;
  }

  private async checkAlterOne(user: User) {
    const alter = await funService.findAlter(user.id);
    if (alter)
      return { realUser: user, alterId: alter };
    return null;
  }

  private async checkAlter(users: Collection<string, User>) {
    const array = users.toJSON();
    for (let i = 0; i < array.length; i++) {
      const alterData = await this.checkAlterOne(array[i]);
      if (alterData)
        return alterData;
    }
    return null;
  }

  private async checkBlacklistOne(member: GuildMember, names: string[]) {
    for (let i = 0; i < names.length; i++) {
      if (member.nickname?.toLowerCase()?.includes(names[i]) || member.user.username?.toLowerCase()?.includes(names[i]))
        return i;
    }
    return null;
  }

  private async checkBlacklist(users: Collection<string, GuildMember>, names: string[]) {
    const array = users.toJSON();
    for (let i = 0; i < array.length; i++) {
      const name = this.checkBlacklistOne(array[i], names)
      if (name)
        return name;
    }
    return null;
  }

  private async countDebuffResist(id: string) {
    const counter = await funService.findDebuffResistCounter(id).then(value => Number(value));
    const iterator = Array.from({ length: counter }, (_, i) => i)
    const allBuffs = await Promise.all(iterator.map(index => funService.ttlDebuffResist(id, index)));
    const results = allBuffs.filter(b => b > 0);
    return results;
  }
}
