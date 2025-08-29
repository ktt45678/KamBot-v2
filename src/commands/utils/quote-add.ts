import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message, User } from 'discord.js';
import { Ajv } from 'ajv/dist/jtd';
import { customAlphabet } from 'nanoid';

import { DiscordEmbedError, generateErrorMessage } from '../../common/utils';
import { guildQuoteModel } from '../../models';
import { EmbedColors } from '../../common/enums';
import { quoteMessageSchema } from '../../common/ajv';

@ApplyOptions<Command.Options>({
  name: 'quoteadd',
  aliases: ['qadd'],
  fullCategory: ['Utility'],
  description: 'Adds a new quote with the specified name and message.',
  detailedDescription: {
    usage: '[quote name] [content]',
    examples: ['hello hi']
  },
  quotes: []
})
export class ListQuotesCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.inGuild()) {
      if (!message.channel.isSendable()) return;
      const embed = generateErrorMessage('Please use this command in a server');
      return message.channel.send({ embeds: [embed] });
    }
    const quoteString = await args.rest('string').catch(() => null);
    if (!quoteString) {
      const embed = generateErrorMessage('Please provide the content');
      return message.channel.send({ embeds: [embed] });
    }
    const quoteContent = this.parseQuoteFromString(quoteString);
    const quote = await this.saveQuote(quoteContent.name, quoteContent.content, message.guildId, message.author.id);
    const embed = this.generateQuoteAdded(message.author, quote._id, quote.nanoId, quote.name);
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {

  }

  private async saveQuote(name: string, content: string, guildId: string, authorId: string) {
    const parsedName = name.trim().toLowerCase();
    let parsedContent: string | {} = content.replace(/(\r\n|\n|\r)/gm, '');
    const isValidJson = this.isValidJson(<string>parsedContent);
    if (isValidJson) {
      parsedContent = await this.parseJsonQuote(<string>parsedContent);
    } else {
      parsedContent = content.trim();
    }
    const guildQuote = new guildQuoteModel();
    guildQuote.nanoId = await this.generateUniqueNanoId();
    guildQuote.guild = guildId;
    guildQuote.author = authorId;
    guildQuote.name = parsedName;
    guildQuote.content = parsedContent;
    await guildQuote.save();
    return guildQuote.toObject();
  }

  private parseQuoteFromString(content: string) {
    const regex = /^(?:"([^"]+)"|(\S+))\s+([\s\S]*)$/;
    const match = content.match(regex);

    if (match) {
      const name = match[1] || match[2];
      const content = match[3];

      return {
        name: name,
        content: content
      };
    }

    throw new DiscordEmbedError('You must provide both quote name and content', 'Error');
  }

  private isValidJson(content: string) {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  private async parseJsonQuote(content: string) {
    const ajv = new Ajv();
    const parse = ajv.compileParser(quoteMessageSchema);
    const parsed: any = parse(content);
    if (!parsed)
      throw new DiscordEmbedError(parse.message || 'Unknown', 'Error parsing string');
    const quote = {
      content: parsed.content,
      embeds: parsed.embeds?.map((e: any) => ({
        title: e.title,
        description: e.description,
        author: e.author,
        color: e.color ? parseInt(e.color.substring(1), 16) : undefined,
        footer: e.footer,
        thumbnail: { url: e.thumbnail },
        image: { url: e.image },
        fields: e.fields
      }))
    };
    return quote;
  }

  private async generateUniqueNanoId() {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nanoid = customAlphabet(alphabet, 7);
    let id;
    do {
      id = nanoid();
      const quote = await guildQuoteModel.findOne({ nanoId: id }).lean().exec();
      if (!quote)
        break;
    } while (true);
    return id;
  }

  private generateQuoteAdded(user: User, id: number, nanoid: string, name: string) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Quote added', iconURL: user.displayAvatarURL({ forceStatic: true, size: 128 }) })
      .addFields(
        { name: 'ID', value: id.toString(), inline: true },
        { name: 'ID 2', value: nanoid, inline: true },
        { name: 'Name', value: name, inline: false }
      );
  }
}