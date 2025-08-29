import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Guild, Message } from 'discord.js';
import { FlattenMaps } from 'mongoose';

import { generateErrorMessage } from '../../common/utils';
import { GuildQuote, guildQuoteModel } from '../../models';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'listquotes',
  aliases: ['liqu'],
  fullCategory: ['Utility'],
  description: 'Lists all quotes on the server',
  detailedDescription: {
    usage: '[<page>] [<sort by>]',
    examples: ['', '2', '2 id']
  },
})
export class ListQuotesCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addNumberOption(option =>
          option
            .setName('page')
            .setDescription('Page number')
        )
        .addStringOption(option =>
          option
            .setName('sort')
            .setDescription('Sort by field')
            .setChoices(
              { name: 'Id', value: 'id' },
              { name: 'Name', value: 'name' },
              { name: 'Date', value: 'date' }
            )
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    if (!message.inGuild()) {
      const embed = generateErrorMessage('Please use this command in a server');
      return message.channel.send({ embeds: [embed] });
    }
    const page = await args.pick('integer').catch(() => 1);
    const sort = await args.pick('string').catch(() => null);
    const results = await this.findAllQuotes(message.guildId, page, sort);
    const embed = this.generateQuoteList(results, message.guild, page);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      const embed = generateErrorMessage('Please use this command in a server');
      return interaction.reply({ embeds: [embed] });
    }
    await interaction.deferReply();
    const page = interaction.options.getInteger('page', false) || 1;
    const sort = interaction.options.getString('sort', false) || null;
    const results = await this.findAllQuotes(interaction.guildId, page, sort);
    const embed = this.generateQuoteList(results, interaction.guild!, page);
    return interaction.followUp({ embeds: [embed] });
  }

  private findAllQuotes(guildId: string, page: number, sort: string | null) {
    const limit = 15;
    const skip = (page - 1) * limit;
    let sortBy = '_id';
    if (sort === 'name')
      sortBy = 'name';
    else if (sort === 'date')
      sortBy = 'createdAt';
    return guildQuoteModel.find(
      { guild: guildId },
      { _id: 1, nanoId: 1, guild: 1, name: 1, createdAt: 1 },
      { skip, limit, sort: { [sortBy]: 1 } }
    ).lean().exec();
  }

  private generateQuoteList(quotes: FlattenMaps<GuildQuote>[], guild: Guild, page: number) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ forceStatic: true, size: 128 }) || undefined })
      .setTitle(`Quotes - Page ${page}`);
    let description = '';
    if (!quotes.length)
      description = 'No results.';
    quotes.forEach((quote, index) => {
      description += `\`#${quote._id}\` **${quote.name.toUpperCase()}** by ${quote.author}`;
      if (index !== quotes.length - 1)
        description += '\n';
    });
    embed.setDescription(description);
    return embed;
  }
}