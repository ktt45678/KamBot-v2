import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { Message } from 'discord.js';

import { generateErrorMessage, generateInfoMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'sendmessage',
  fullCategory: ['Owner'],
  description: 'Send a message',
  detailedDescription: {
    usage: '<server id> <channel id> <content>',
    examples: ['1135891123362087044 1135891252630532186 this is a message']
  },
  preconditions: ['OwnerOnly']
})
export class SendMessageCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    const guildId = await args.pick('string').catch(() => null);
    if (guildId === null) {
      const errorEmbedMessage = generateErrorMessage('Invalid server id');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    if (guildId === 'this') {
      const content = await args.rest('string').catch(() => null);
      if (content === null) {
        const errorEmbedMessage = generateErrorMessage('Message content must not be empty');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }
      return message.channel.send({ content: content });
    }
    const channelId = await args.pick('string').catch(() => null);
    if (channelId === null) {
      const errorEmbedMessage = generateErrorMessage('Invalid channel id');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const content = await args.rest('string').catch(() => null);
    if (content === null) {
      const errorEmbedMessage = generateErrorMessage('Message content must not be empty');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const guild = await message.client.guilds.fetch(guildId);
    if (!guild) {
      const errorEmbedMessage = generateErrorMessage('Server not found');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const channel = await guild.channels.fetch(channelId);
    if (!channel) {
      const errorEmbedMessage = generateErrorMessage('Channel not found');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    } else if (!channel.isThread() && !channel.isTextBased()) {
      const errorEmbedMessage = generateErrorMessage('Channel must be a server text channel');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    await channel.send({ content });
    const embed = generateInfoMessage('Message sent');
    return message.channel.send({ embeds: [embed] });
  }
}
