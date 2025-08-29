import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';
import { FlattenMaps } from 'mongoose';

import { DiscordEmbedError, generateErrorMessage } from '../../common/utils';
import { GuildQuote, guildQuoteModel } from '../../models';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'quotedel',
  aliases: ['qdel'],
  fullCategory: ['Utility'],
  description: 'Delete a quote',
  detailedDescription: {
    usage: '[id] or [id 2]',
    examples: ['10000']
  },
})
export class QuoteDelCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('id')
            .setDescription('Quote id')
            .setRequired(true)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) {
      if (!message.channel.isSendable()) return;
      const embed = generateErrorMessage('Please use this command in a server');
      return message.channel.send({ embeds: [embed] });
    }
    const quoteId = await args.rest('string').catch(() => null);
    if (!quoteId) {
      const embed = generateErrorMessage('Please provide an ID');
      return message.channel.send({ embeds: [embed] });
    }
    const quote = await this.deleteQuote(quoteId, message.author.id);
    if (!quote) {
      const embed = generateErrorMessage('ID not found');
      return message.channel.send({ embeds: [embed] });
    }
    const embed = this.generateQuoteDeleted(message.author, quote._id, quote.nanoId, quote.name);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      const embed = generateErrorMessage('Please use this command in a server');
      return interaction.reply({ embeds: [embed] });
    }
    await interaction.deferReply();
    const quoteId = interaction.options.getString('id', true);
    const quote = await this.deleteQuote(quoteId, interaction.user.id);
    if (!quote) {
      const embed = generateErrorMessage('ID not found');
      return interaction.followUp({ embeds: [embed] });
    }
    const embed = this.generateQuoteDeleted(interaction.user, quote._id, quote.nanoId, quote.name);
    return interaction.followUp({ embeds: [embed] });
  }

  private async deleteQuote(id: string, authorId: string) {
    let quote: (FlattenMaps<GuildQuote> & Required<{ _id: number; }>) | null;
    if (!isNaN(<any>id)) {
      quote = await guildQuoteModel.findOne({ _id: Number(id) }).lean().exec();
    } else {
      quote = await guildQuoteModel.findOne({ nanoId: id }).lean().exec();
    }
    if (!quote)
      return null;
    if (quote.author !== authorId)
      throw new DiscordEmbedError('You cannot delete this quote');
    await guildQuoteModel.deleteOne({ _id: quote._id });
    return quote;
  }

  private generateQuoteDeleted(user: User, id: number, nanoid: string, name: string) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Quote deleted', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .addFields(
        { name: 'ID', value: id.toString(), inline: true },
        { name: 'ID 2', value: nanoid, inline: true },
        { name: 'Name', value: name, inline: false }
      );
  }
}