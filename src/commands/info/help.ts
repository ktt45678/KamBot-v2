import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, ClientUser, EmbedBuilder, Message } from 'discord.js';

import { EmbedColors } from '../../common/enums';
import { generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'help',
  fullCategory: ['Information'],
  description: 'Shows the help message',
  detailedDescription: {
    usage: '[<command>]',
    examples: ['', 'ping']
  }
})
export class HelpCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('command')
            .setDescription('The command name')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (args.finished) {
      const embed = this.generateCommandList(message.client.user);
      return message.channel.send({ embeds: [embed] });
    }

    const commandName = await args.pick('string').catch(() => null);
    if (!commandName) {
      const embed = generateErrorMessage('Failed to retrieve command name');
      return message.channel.send({ embeds: [embed] });
    }

    const command = this.container.stores.get('commands').get(commandName);
    if (!command) {
      const embed = generateErrorMessage('Command name does not exist');
      return message.channel.send({ embeds: [embed] });
    }

    const embed = this.generateCommandInfo(command, message.client.user);
    return message.channel.send({ embeds: [embed] });
  }

  public chatInputRun(interaction: ChatInputCommandInteraction) {
    const commandName = interaction.options.getString('command');
    if (!commandName) {
      const embed = this.generateCommandList(interaction.client.user);
      return interaction.reply({ embeds: [embed] });
    }

    const command = this.container.stores.get('commands').get(commandName);
    if (!command) {
      const embed = generateErrorMessage('Command name does not exist');
      return interaction.reply({ embeds: [embed] });
    }

    const embed = this.generateCommandInfo(command, interaction.client.user);
    return interaction.reply({ embeds: [embed] });
  }

  private generateCommandList(user: ClientUser) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Available commands', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) });
    const categories = this.createCategoryList();
    for (const key in categories) {
      if (key !== 'Owner')
        embed.addFields({ name: key, value: categories[key] });
    }
    return embed;
  }

  private generateCommandInfo(command: Command, user: ClientUser) {
    const examples = (<any>command.detailedDescription)?.examples ?
      (<any>command.detailedDescription).examples.map((e: string) => `${command.name} ${e}`.trimEnd()).join(', ') : null;
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: command.name, iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .setDescription(`\`\`\`${command.description || 'Not set'}\`\`\``)
      .addFields(
        { name: 'Category', value: command.category || 'Uncategorized', inline: true },
        { name: 'Params', value: (<any>command.detailedDescription)?.usage || 'None', inline: true },
        { name: 'Examples', value: examples || 'None', inline: false },
        { name: 'Aliases', value: command.aliases.join(', ') || 'None', inline: false }
      )
  }

  private createCategoryList() {
    const commands = this.container.stores.get('commands');
    return commands.reduce((r: { [key: string]: string }, a) => {
      const category = a.category || 'Uncategorized';
      r[category] = r[category] || '';
      r[category] += `\`${a.name}\` `;
      return r;
    }, {});
  }
}
