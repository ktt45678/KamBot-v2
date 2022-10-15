import { ApplyOptions } from '@sapphire/decorators';
import { Args, Command } from '@sapphire/framework';
import { ApplicationCommand, Message, REST, Routes } from 'discord.js';

import { BOT_TOKEN, OWNER_ID } from '../../config';

@ApplyOptions<Command.Options>({
  name: 'removeslash',
  aliases: [],
  description: 'Remove a slash command'
})
export class RemoveSlashCommand extends Command {
  public async messageRun(message: Message, args: Args) {
    const commandName = await args.pick('string');
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN!);

    if (message.author.id !== OWNER_ID) {
      return message.channel.send({
        content: 'This command is owner only'
      });
    }

    if (!message.guildId) {
      return message.channel.send({
        content: 'DM not supported'
      });
    }
    const commands = await rest.get(Routes.applicationCommands(message.client.id!)) as ApplicationCommand[];
    const command = commands.find(cmd => cmd.name === commandName);
    if (!command) {
      return message.channel.send({
        content: 'Command not found'
      });
    }

    await rest.delete(Routes.applicationCommand(message.client.id!, command.id));

    return message.channel.send({
      content: 'Slash command removed'
    });
  }
}
