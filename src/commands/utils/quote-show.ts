import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, Message } from 'discord.js';

import { generateErrorMessage } from '../../common/utils';
import { guildQuoteModel } from '../../models';

@ApplyOptions<Command.Options>({
  name: 'quoteshow',
  aliases: ['qshow'],
  fullCategory: ['Utility'],
  description: 'Show a random quote',
  detailedDescription: {
    usage: '[name]',
    examples: ['hello']
  },
})
export class QuoteShowCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Quote name')
            .setRequired(true)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild())
      return;
    const name = await args.rest('string').catch(() => null);
    if (!name)
      return;
    const quote = await this.findRandomQuote(name, message.guildId);
    if (!quote)
      return;
    if (typeof quote.content === 'string')
      return message.channel.send({ content: `\`#${quote._id}\` ${quote.content || ''}` });
    return message.channel.send({ content: `\`#${quote._id}\` ${quote.content.content || ''}`, embeds: quote.content.embeds });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      const embed = generateErrorMessage('Please use this command in a server');
      return interaction.reply({ embeds: [embed] });
    }
    await interaction.deferReply();
    const name = interaction.options.getString('name', true);
    const quote = await this.findRandomQuote(name, interaction.guildId);
    if (!quote) {
      const embed = generateErrorMessage('Quote not found');
      return interaction.followUp({ embeds: [embed] });
    }
    if (typeof quote.content === 'string')
      return interaction.followUp({ content: quote.content });
    return interaction.followUp({ content: quote.content.content, embeds: quote.content.embeds });
  }

  private async findRandomQuote(name: string, guild: string) {
    const quotes = await guildQuoteModel.find(
      { guild, name },
      { _id: 1, nanoId: 1, guild: 1, name: 1, content: 1, createdAt: 1 },
      { sort: { _id: 1 } }
    ).lean().exec();
    if (!quotes.length)
      return null;
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    return quote;
  }
}