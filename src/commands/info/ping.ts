import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'ping',
  aliases: ['pong'],
  fullCategory: ['Information'],
  description: 'Ping!'
})
export class PingCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public async messageRun(message: Message) {
    if (!message.channel.isSendable()) return;
    const msg = await message.channel.send('Ping?');
    const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${msg.createdTimestamp - message.createdTimestamp}ms.`;
    return msg.edit(content);
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const msg = await interaction.reply({ content: 'Ping?', fetchReply: true });
    const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${msg.createdTimestamp - interaction.createdTimestamp}ms.`;
    return await interaction.editReply({
      content: content
    });
  }
}
