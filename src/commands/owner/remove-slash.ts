import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { ApplicationCommand, Message, REST, Routes } from 'discord.js';

import { BOT_TOKEN } from '../../config';
import { generateErrorMessage, generateInfoMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'removeslash',
  fullCategory: ['Owner'],
  description: 'Remove a slash command',
  preconditions: ['OwnerOnly']
})
export class RemoveSlashCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    const commandName = await args.pick('string').catch(() => null);
    if (!commandName) {
      const errorEmbedMessage = generateErrorMessage('Command name is required');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }

    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!);

    const commands = await rest.get(Routes.applicationCommands(message.client.id!)) as ApplicationCommand[];
    const command = commands.find(cmd => cmd.name === commandName);
    if (!command) {
      const errorEmbedMessage = generateErrorMessage('Command not found');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }

    await rest.delete(Routes.applicationCommand(message.client.id!, command.id));

    const embed = generateInfoMessage('Slash command removed', 'Remove slash command');
    return message.channel.send({ embeds: [embed] });
  }
}
