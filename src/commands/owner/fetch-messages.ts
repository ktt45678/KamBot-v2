import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { Collection, DMChannel, EmbedBuilder, Guild, Message, PartialDMChannel, TextBasedChannel } from 'discord.js';

import { generateErrorMessage } from '../../common/utils';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'fetchmessages',
  fullCategory: ['Owner'],
  description: 'Fetch messages',
  detailedDescription: {
    usage: '<server id> <channel id> [<limit>]',
    examples: ['1135884531992383559 1135883138346795069 30']
  },
  preconditions: ['OwnerOnly']
})
export class FetchMessagesCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    const guildId = await args.pick('string').catch(() => null);
    if (guildId === null) {
      const errorEmbedMessage = generateErrorMessage('Invalid server id');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    if (guildId === 'this') {
      if (!message.inGuild()) {
        const errorEmbedMessage = generateErrorMessage('Parameter "this" can only be used in a server');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
      const messageLimit = await args.pick('integer').catch(() => 30);
      const messages = await message.channel.messages.fetch({ limit: messageLimit });
      const embed = this.generateMessageList(messages, message.channel, message.guild);
      return message.channel.send({ embeds: [embed] });
    }
    const channelId = await args.pick('string').catch(() => null);
    if (channelId === null) {
      const errorEmbedMessage = generateErrorMessage('Invalid channel id');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const messageLimit = await args.pick('integer').catch(() => 30);
    const guild = await message.client.guilds.fetch(guildId);
    if (!guild) {
      const errorEmbedMessage = generateErrorMessage('Server not found');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      const errorEmbedMessage = generateErrorMessage('Channel not found');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    } else if (!channel.isTextBased()) {
      const errorEmbedMessage = generateErrorMessage('Channel must be a text or thread channel');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const messages = await channel.messages.fetch({ limit: messageLimit });
    const embed = this.generateMessageList(messages, channel, guild);
    return message.channel.send({ embeds: [embed] });
  }

  private generateMessageList(messages: Collection<string, Message<boolean>>, channel: Exclude<TextBasedChannel, DMChannel | PartialDMChannel>, guild: Guild) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setTitle(`Messages from ${channel.name}`);
    messages.forEach(message => {
      let content = message.cleanContent || '<empty>';
      if (message.attachments.size) {
        message.attachments.forEach(attachment => {
          content += `, Attachment: ${attachment.url}`;
        });
      }
      embed.addFields({ name: `${message.author.username} - ${message.createdAt}`, value: content, inline: false });
    });
    return embed;
  }
}
