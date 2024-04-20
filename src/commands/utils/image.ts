import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { AttachmentBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import { ImagesResponse } from 'openai';
import path from 'path';
import { AxiosError } from 'axios';

import { http } from '../../modules';
import { openAIService } from '../../services/openai';
import { createSendTypingInterval, generateErrorMessage } from '../../common/utils';

@ApplyOptions<Command.Options>({
  name: 'image',
  aliases: ['imagine'],
  fullCategory: ['Utility'],
  description: 'Create images from text',
  detailedDescription: {
    usage: '<prompt>',
    examples: ['beautiful sky']
  }
})
export class ImageCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('prompt')
            .setDescription('Prompt to generate images')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('model')
            .setDescription('Image generation model')
            .setChoices(
              { name: 'Midjourney', value: 'midjourney' },
              { name: 'Stable Diffusion XL', value: 'sdxl' },
              { name: 'Dall-E 3', value: 'dall-e-3' },
              { name: 'Playground v2.5', value: 'playground-v2.5' },
              { name: 'Kandinsky 3', value: 'kandinsky-3' },
              { name: 'Kandinsky 2.2', value: 'kandinsky-2.2' },
              { name: 'Kandinsky 2', value: 'kandinsky-2' }
            )
        )
        // .addStringOption(option =>
        //   option
        //     .setName('style')
        //     .setDescription('Style to generate images')
        //     .setChoices(
        //       { name: 'Anime', value: 'anime' },
        //       { name: 'Photographic', value: 'photographic' },
        //       { name: 'Digital art', value: 'digitalart' },
        //       { name: 'Comic book', value: 'comicbook' },
        //       { name: 'Fantasy art', value: 'fantasyart' },
        //       { name: 'Analog film', value: 'analogfilm' },
        //       { name: 'Neon punk', value: 'neonpunk' },
        //       { name: 'Isometric', value: 'isometric' },
        //       { name: 'Low poly', value: 'lowpoly' },
        //       { name: 'Origami', value: 'origami' },
        //       { name: 'Line art', value: 'lineart' },
        //       { name: 'Cinematic', value: 'cinematic' },
        //       { name: '3D model', value: '3dmodel' },
        //       { name: 'Pixel art', value: 'pixelart' }
        //     )
        // )
        .addIntegerOption(option =>
          option
            .setName('images')
            .setDescription('Number of images to generate')
            .setMaxValue(5)
            .setMinValue(1)
        )
        .addBooleanOption(option =>
          option
            .setName('private')
            .setDescription('Make this interaction private, only you can see the response')
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (args.finished) {
      const errorEmbedMessage = generateErrorMessage('Please enter a text');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }
    const sendTypingInterval = await createSendTypingInterval(message.channel);
    try {
      const prompt = await args.rest('string');
      const createImageResponse = await openAIService.createImages(prompt);
      const files = await this.generateImageResult(createImageResponse);
      return message.channel.send({ content: '> ' + prompt, files });
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorEmbedMessage = generateErrorMessage(error.response.data.detail, 'Error ' + (error.response.status || 'unknwon'));
        return message.channel.send({ embeds: [errorEmbedMessage] });
      } else {
        throw error;
      }
    } finally {
      clearInterval(sendTypingInterval);
    }
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const prompt = interaction.options.getString('prompt', true);
    const model = interaction.options.getString('model') || 'sdxl';
    //const style = interaction.options.getString('style') || undefined;
    const privateResponse = interaction.options.getBoolean('private') || false;
    const totalImages = interaction.options.getInteger('images') || 4;
    await interaction.deferReply({ ephemeral: privateResponse });
    try {
      const createImageResponse = await openAIService.createImages(prompt, model, totalImages);
      const files = await this.generateImageResult(createImageResponse);
      let responseContent = '> ' + prompt;
      // if (style) {
      //   const option = <ApplicationCommandStringOption | undefined>interaction.command?.options.find(o => o.name === 'style');
      //   if (option && option.choices) {
      //     const choiceName = option.choices.find(c => c.value === style)?.name || style;
      //     responseContent += `\n**Style: ${choiceName}**`;
      //   }
      // }
      return interaction.followUp({ content: responseContent, files, ephemeral: privateResponse });
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        console.log(error.response);
        const errorMessageContent = error.response.data.detail || error.response.data.error?.message || 'Unspecified error message';
        const errorEmbedMessage = generateErrorMessage(errorMessageContent, 'API Error ' + (error.response.status || 'unknwon'));
        return interaction.followUp({ embeds: [errorEmbedMessage] });
      } else {
        console.log(error);
        throw error;
      }
    }
  }

  private async generateImageResult(createImageResponse: ImagesResponse): Promise<AttachmentBuilder[]> {
    const attachments: AttachmentBuilder[] = [];
    for (let i = 0; i < createImageResponse.data.length; i++) {
      const url = createImageResponse.data[i].url!;
      // const filename = createImageResponse.data[i].name;
      // const fileBuffer = Buffer.from(url, 'base64');
      const filename = path.basename(url);
      const fileBuffer = await http.get(url, { responseType: 'arraybuffer' }).then(res => res.data);
      const attactment = new AttachmentBuilder(fileBuffer, { name: filename });
      attachments.push(attactment);
    }
    return attachments;
  }
}
