import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command, CommandOptionsRunTypeEnum } from '@sapphire/framework';
import { ChannelType, ChatInputCommandInteraction, EmbedBuilder, Guild, GuildPremiumTier, Message } from 'discord.js';

import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'server',
  aliases: ['sv'],
  fullCategory: ['Information'],
  description: 'Shows info about this server. Can be used to get server\'s images and more',
  detailedDescription: {
    usage: '[<icon | banner | splash | roles | channels>]',
    examples: ['', 'icon', 'banner']
  },
  runIn: CommandOptionsRunTypeEnum.GuildAny
})
export class ServerCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('Type of info')
            .setChoices(
              { name: 'Icon', value: 'icon' },
              { name: 'Banner', value: 'banner' },
              { name: 'Splash', value: 'splash' },
              { name: 'Roles', value: 'roles' },
              { name: 'Channels', value: 'channels' }
            )
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    if (!message.inGuild()) return;
    if (!args.finished) {
      const type = await args.pick('string').then(value => value.toLowerCase());
      const embed = await this.generateEmbedByType(message.guild, type);
      return message.channel.send({ embeds: [embed] });
    }
    const embed = await this.generateInfo(message.guild);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const type = interaction.options.getString('type');
    if (type) {
      const embed = await this.generateEmbedByType(interaction.guild, type);
      return interaction.reply({ embeds: [embed] });
    }
    const embed = await this.generateInfo(interaction.guild);
    return interaction.reply({ embeds: [embed] });
  }

  private async generateEmbedByType(guild: Guild, type: string) {
    let embed: EmbedBuilder;
    switch (type) {
      case 'icon':
        embed = this.generateIcon(guild);
        break;
      case 'banner':
        embed = this.generateBanner(guild);
        break;
      case 'splash':
        embed = this.generateSplash(guild);
        break;
      case 'roles':
        embed = await this.generateRoles(guild);
        break;
      case 'channels':
        embed = this.generateChannels(guild);
        break;
      default:
        embed = await this.generateInfo(guild);
        break;
    }
    return embed;
  }

  private async generateInfo(guild: Guild) {
    const owner = await guild.fetchOwner();
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setThumbnail(guild.iconURL({ forceStatic: false, size: 128 }))
      .addFields(
        { name: 'ID', value: guild.id, inline: false },
        { name: 'Verification Level', value: guild.verificationLevel.toString(), inline: false },
        { name: 'Shard', value: guild.shard.ping.toString(), inline: true },
        { name: 'Members', value: guild.memberCount.toString(), inline: true },
        { name: 'Channels', value: 'Use argument `channels` to view all channels.', inline: false },
        { name: 'Server Owner', value: `${owner.user.tag} [${owner.id}]`, inline: false },
        { name: 'Roles', value: 'Use argument `roles` to view all roles.', inline: false },
        { name: 'Server Boosts', value: `Level: ${guild.premiumTier === GuildPremiumTier.None ? 0 : guild.premiumTier}\nBoosts: ${guild.premiumSubscriptionCount}`, inline: false }
      );
  }

  private generateIcon(guild: Guild) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setImage(guild.iconURL({ forceStatic: false, size: 256 }));
  }

  private generateBanner(guild: Guild) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined });
    const bannerURL = guild.bannerURL({ forceStatic: false, size: 1024 });
    if (!bannerURL) return embed.setDescription('Server has no banner image');
    return embed.setImage(bannerURL);
  }

  private generateSplash(guild: Guild) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
    const splashURL = guild.splashURL({ forceStatic: false, size: 1024 });
    if (!splashURL) return embed.setDescription('Server has no invite background');
    return embed.setImage(splashURL);
  }

  private async generateRoles(guild: Guild) {
    const roleArray = await guild.roles.fetch().then(roles => roles.toJSON());
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .addFields({ name: `Roles (${roleArray.length})`, value: roleArray.join(' '), inline: false });
  }

  private generateChannels(guild: Guild) {
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).first(15);
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).first(15);
    const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).first(15);
    return new EmbedBuilder()
      .setColor(0x4ab0ff)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .addFields(
        { name: `Categories (${categoryChannels.length.toString()})`, value: categoryChannels.join(' '), inline: true },
        { name: `Text channels (${textChannels.length.toString()})`, value: textChannels.join(' '), inline: true },
        { name: `Voice channels (${voiceChannels.length.toString()})`, value: voiceChannels.join(' '), inline: true }
      );
  }
}
