import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { Message } from 'discord.js';

import { gifImageModel } from '../../models';
import { generateErrorMessage, generateInfoMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'addgif',
  fullCategory: ['Owner'],
  description: 'Add an image into gif collection',
  detailedDescription: {
    usage: '<url> <kind> <comment>',
    examples: ['https://example.com slap "Got slapped"']
  },
  preconditions: ['OwnerOnly']
})
export class AddGifCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    const url = await args.pick('url').catch(() => null);
    const kind = await args.pick('string').catch(() => null);
    const comment = await args.rest('string').catch(() => null);
    if (!url) {
      const errorEmbedMessage = generateErrorMessage('Url is required');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    if (!kind) {
      const errorEmbedMessage = generateErrorMessage('Kind is required');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    if (!['slap', 'godit'].includes(kind)) {
      const errorEmbedMessage = generateErrorMessage('Kind must be "slap" or "godit"');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const gif = new gifImageModel({ url: url.href, kind, comment });
    await gif.save();
    const embed = generateInfoMessage('Gif has been added');
    return message.channel.send({ embeds: [embed] });
  }
}
