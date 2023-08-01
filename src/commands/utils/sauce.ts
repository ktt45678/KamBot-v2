import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ActionRowBuilder, ChatInputCommandInteraction, ComponentType, EmbedBuilder, Message, StringSelectMenuBuilder, User } from 'discord.js';

import { saucenaoService } from '../../services';
import { EmbedColors } from '../../common/enums';
import { generateErrorMessage, isUrl } from '../../common/utils';
import { SauceResult, SaucenaoSearchResponse } from '../../common/interfaces/utils';

@ApplyOptions<Command.Options>({
  name: 'sauce',
  fullCategory: ['Utility'],
  description: 'Search for sauces from an image',
  detailedDescription: {
    usage: '[<url | attachment>]',
    examples: ['', 'https://example.com/image.jpg']
  }
})
export class SauceCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('Search by url')
        )
        .addAttachmentOption(option =>
          option
            .setName('image')
            .setDescription('Search by image')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    let url: string | null = null;
    let spoiler: boolean = false;
    if (!args.finished) {
      url = await args.pick('string');
      if (!isUrl(url)) {
        const embed = generateErrorMessage('Input must be a url');
        return message.channel.send({ embeds: [embed] });
      }
    } else if (message.attachments.size) {
      const attachment = message.attachments.first()!;
      url = attachment.url;
      spoiler = attachment.spoiler;
    } else if (message.reference?.messageId) {
      const refMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (!refMessage) {
        const embed = generateErrorMessage('Invalid reference message');
        return message.channel.send({ embeds: [embed] });
      }
      if (refMessage.attachments.size) {
        const attachment = refMessage.attachments.first()!;
        url = attachment.url;
        spoiler = attachment.spoiler;
      }
      else if (refMessage.embeds.length && refMessage.embeds[0].image) {
        url = refMessage.embeds[0].image.url;
      }
    }
    if (url) {
      let sauceNaoResponse: SaucenaoSearchResponse;
      try {
        sauceNaoResponse = await saucenaoService.findSauce(url);
      } catch (e) {
        const embed = generateErrorMessage('Error from Saucenao API', 'Saucenao error');
        return message.channel.send({ embeds: [embed] });
      }
      if (!sauceNaoResponse || !sauceNaoResponse.results.length) {
        const embed = generateErrorMessage('No results were found', 'Failed searching');
        return message.channel.send({ embeds: [embed] });
      }
      let embedResults = this.generateSauceNaoResults(message.author, sauceNaoResponse.results, spoiler);
      const action = this.generateSauceNaoActions(sauceNaoResponse.results);
      const sauceMessage = await message.channel.send({ embeds: [embedResults], components: [action] });
      do {
        const stringSelectInteraction = await sauceMessage.awaitMessageComponent({
          filter: m => m.user.id === message.author.id && m.customId === 'select-sauce', time: 60000, componentType: ComponentType.StringSelect
        }).catch(() => null);
        if (!stringSelectInteraction) {
          embedResults = this.generateInteractionEnded(embedResults);
          return sauceMessage.edit({ embeds: [embedResults], components: [] });
        }
        const displayIndex = +stringSelectInteraction.values[0] ?? 1;
        embedResults = this.generateSauceNaoResults(message.author, sauceNaoResponse.results, spoiler, displayIndex);
        await stringSelectInteraction.update({ embeds: [embedResults] });
      } while (true);
    }
    const embed = generateErrorMessage('Please include a url or attachment');
    return message.channel.send({ embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    let url: string | null = null;
    let spoiler: boolean = false;
    const inputUrl = interaction.options.getString('url');
    const inputImage = interaction.options.getAttachment('image');
    if (inputUrl !== null && isUrl(inputUrl))
      url = inputUrl;
    else if (inputImage !== null)
      url = inputImage.url;
    if (url) {
      await interaction.deferReply();
      let sauceNaoResponse: SaucenaoSearchResponse;
      try {
        sauceNaoResponse = await saucenaoService.findSauce(url);
      } catch (e) {
        const embed = generateErrorMessage('Error from Saucenao API', 'Saucenao error');
        return interaction.followUp({ embeds: [embed] });
      }
      if (!sauceNaoResponse || !sauceNaoResponse.results.length) {
        const embed = generateErrorMessage('No results were found', 'Failed searching');
        return interaction.followUp({ embeds: [embed] });
      }
      let embedResults = this.generateSauceNaoResults(interaction.user, sauceNaoResponse.results, spoiler);
      const action = this.generateSauceNaoActions(sauceNaoResponse.results);
      const sauceMessage = await interaction.followUp({ embeds: [embedResults], components: [action] });
      do {
        const stringSelectInteraction = await sauceMessage.awaitMessageComponent({
          filter: m => m.user.id === interaction.user.id && m.customId === 'select-sauce', time: 60000, componentType: ComponentType.StringSelect
        }).catch(() => null);
        if (!stringSelectInteraction) {
          embedResults = this.generateInteractionEnded(embedResults);
          return sauceMessage.edit({ embeds: [embedResults], components: [] });
        }
        const displayIndex = +stringSelectInteraction.values[0] ?? 1;
        embedResults = this.generateSauceNaoResults(interaction.user, sauceNaoResponse.results, spoiler, displayIndex);
        await stringSelectInteraction.update({ embeds: [embedResults] });
      } while (true);
    }
    const embed = generateErrorMessage('Please include a url or attachment');
    return interaction.reply({ embeds: [embed] });
  }

  private generateSauceNaoResults(user: User, results: SauceResult[], spoiler: boolean, displayIndex: number = 1) {
    let content = '';
    const currentIndex = displayIndex - 1;
    const embed = new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setAuthor({ name: 'Found sauce', iconURL: user.displayAvatarURL({ forceStatic: false, size: 128 }) })
      .setFooter({ text: 'This timeouts in 60 seconds. Use the menu to change the image' });
    if (spoiler) {
      embed.addFields({ name: 'Thumbnail disabled', value: 'The original image is marked as spoiler' });
    } else {
      embed.setImage(results[currentIndex].header.thumbnail);
    }
    if (currentIndex >= 0 && currentIndex < results.length) {
      content += `**${displayIndex}. [${results[currentIndex].header.index_name}](${results[currentIndex].data.ext_urls[0] || results[currentIndex].header.thumbnail})**\n`;
      switch (results[currentIndex].header.index_id) {
        case 5: // Pixiv Images
        case 6: // Pixiv Historical
          embed.addFields({
            name: '**Title**',
            value: results[currentIndex].data.title!
          }, {
            name: '**Member**',
            value: results[currentIndex].data.member_name!
          });
          break;
        case 9: // Danbooru
          embed.addFields({
            name: '**Material**',
            value: results[currentIndex].data.material!
          }, {
            name: '**Characters**',
            value: results[currentIndex].data.characters!
          }, {
            name: '**Author**',
            value: results[currentIndex].data.creator!
          });
          break;
        case 34: // deviantArt
          embed.addFields({
            name: '**Title**',
            value: results[currentIndex].data.title!
          }, {
            name: '**Author**',
            value: results[currentIndex].data.author_name!
          });
          break;
        case 36: // Madokami
          embed.addFields({
            name: '**Source**',
            value: results[currentIndex].data.source!
          }, {
            name: '**Part**',
            value: results[currentIndex].data.part!
          });
          break;
        case 37: // MangaDex
          embed.addFields({
            name: '**Source**',
            value: `${results[currentIndex].data.source}${results[currentIndex].data.part}`!
          }, {
            name: '**Author**',
            value: results[currentIndex].data.author!
          });
          break;
        case 41: // Twitter
          embed.addFields({ name: '**Twitter**', value: `@${results[currentIndex].data.twitter_user_handle!}` });
          break;
        default:
          embed.addFields({ name: '**Title**', value: results[currentIndex].data.title || 'N/A' });
          break;
      }
      embed.addFields({ name: '**Similarity**', value: `${results[currentIndex].header.similarity}%` });
    } else {
      content += 'N/A';
    }
    embed.setDescription(content);
    return embed;
  }

  private generateSauceNaoActions(results: SauceResult[]) {
    const select = new StringSelectMenuBuilder()
      .setCustomId('select-sauce')
      .setPlaceholder('Other results');
    for (let i = 0; i < results.length; i++) {
      let description = `Similarity: ${results[i].header.similarity}%`;
      results[i].data.title && (description += ` - Title: ${results[i].data.title!.substring(0, 24)}`);
      results[i].data.source && (description += ` - Source: ${results[i].data.source!.substring(0, 24)}`);
      select.addOptions({
        label: `${i + 1}. ${results[i].header.index_name}`,
        description: description,
        value: `${i + 1}`
      });
    }
    return new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(select);
  }

  private generateInteractionEnded(embed: EmbedBuilder) {
    return embed.setFooter({ text: 'This interaction ended' });
  }
}
