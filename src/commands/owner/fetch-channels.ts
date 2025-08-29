import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { AnyThreadChannel, Collection, EmbedBuilder, Guild, Message, NonThreadGuildBasedChannel, ReadonlyCollection } from 'discord.js';

import { generateErrorMessage } from '../../common/utils';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'fetchchannels',
  fullCategory: ['Owner'],
  description: 'Fetch channels',
  detailedDescription: {
    usage: '<server id> [<type>]',
    examples: ['1135884322851794964 base', '1135884322851794964 threads']
  },
  preconditions: ['OwnerOnly']
})
export class FetchChannelsCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    const guildId = await args.pick('string').catch(() => null);
    const channelType = await args.pick('string').catch(() => 'base');
    if (guildId === null) {
      const errorEmbedMessage = generateErrorMessage('Invalid server id');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    if (guildId === 'this') {
      if (!message.inGuild()) {
        const errorEmbedMessage = generateErrorMessage('Parameter "this" can only be used in a server');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
      const channels = channelType === 'base' ?
        await message.guild.channels.fetch() :
        await message.guild.channels.fetchActiveThreads().then(res => res.threads);
      const embed = this.generateChannelList(channels, message.guild);
      return message.channel.send({ embeds: [embed] });
    }
    const guild = await message.client.guilds.fetch(guildId);
    if (!guild) {
      const errorEmbedMessage = generateErrorMessage('Server not found');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const channels = channelType === 'base' ?
      await guild.channels.fetch() :
      await guild.channels.fetchActiveThreads().then(res => res.threads);
    const embed = this.generateChannelList(channels, guild);
    return message.channel.send({ embeds: [embed] });
  }

  private generateChannelList(channels: Collection<string, NonThreadGuildBasedChannel | null> | ReadonlyCollection<string, AnyThreadChannel>, guild: Guild) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setTitle(`Channels from ${guild.name}`);
    channels.forEach(channel => {
      channel && embed.addFields({ name: channel.name, value: channel.id, inline: false });
    });
    return embed;
  }
}
