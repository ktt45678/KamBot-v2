import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';

import { GifImage, gifImageModel } from '../../models';
import { EmbedColors } from '../../common/enums';

@ApplyOptions<Command.Options>({
  name: 'slap',
  fullCategory: ['Fun'],
  description: 'Slap anyone',
  detailedDescription: {
    usage: '[<user>]',
    examples: ['', '@user']
  }
})
export class SlapCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Slap a user')
            .setRequired(false)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (!message.channel.isSendable()) return;
    const content = await args.rest('string').catch(() => '');
    const gif = await gifImageModel.findOneRandomGif(this.name);
    const embed = this.generateSlapMessage(gif);
    return message.channel.send({ content: content, embeds: [embed] });
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const content = interaction.options.getUser('user')?.toString() || '';
    const [gif] = await Promise.all([
      gifImageModel.findOneRandomGif(this.name),
      interaction.deferReply()
    ]);
    const embed = this.generateSlapMessage(gif);
    return interaction.followUp({ content: content, embeds: [embed] });
  }

  private generateSlapMessage(gif: GifImage) {
    return new EmbedBuilder()
      .setColor(EmbedColors.Info)
      .setImage(gif.url);
  }
}
