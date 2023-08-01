import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChannelType, ChatInputCommandInteraction, Message, MessageCollector } from 'discord.js';

import { clydeChannelModel } from '../../models';
import { selfbotService } from '../../services';
import { createSendTypingInterval, generateErrorMessage, splitString } from '../../common/utils';
import { CLYDE_BOT_CHANNEL, CLYDE_BOT_GUILD, CLYDE_BOT_REDACTED_WORDS } from '../../config';

@ApplyOptions<Command.Options>({
  name: 'chat',
  aliases: ['gpt', 'clyde'],
  fullCategory: ['Utility'],
  description: 'Chat using Discord\'s Clyde (GPT-3.5)'
})
export class ChatCommand extends Command {
  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Enter your message')
            .setRequired(true)
        )
    );
  }

  public async messageRun(message: Message, args: Args) {
    if (args.finished) {
      const errorEmbedMessage = generateErrorMessage('Please enter your message');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }

    const guild = await message.client.guilds.fetch(CLYDE_BOT_GUILD);

    const msgChannel = await guild.channels.fetch(CLYDE_BOT_CHANNEL);

    if (!msgChannel) {
      const errorEmbedMessage = generateErrorMessage('Error configuring chat bot (reason: channel not found)');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }

    if (msgChannel.type !== ChannelType.GuildForum) {
      const errorEmbedMessage = generateErrorMessage('Error configuring chat bot (reason: invalid channel)');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }

    const savedChannel = await this.resolveChannel(message.author.id, message.author.username);

    const thread = await msgChannel.threads.fetch(savedChannel.channelId);

    if (!thread) {
      const errorEmbedMessage = generateErrorMessage('Error configuring chat bot (reason: could not find saved channel)');
      return message.channel.send({ embeds: [errorEmbedMessage] });
    }

    const sendTypingInterval = await createSendTypingInterval(message.channel);

    try {
      const chatContent = await args.rest('string');
      const chatMsgRes = await this.sendChatMessage(thread.id, chatContent);

      const msgCollector = new MessageCollector(thread, {
        filter: m => m.author.id === '1081004946872352958' && (!m.reference || m.reference.messageId === chatMsgRes.data.id),
        time: 300_000,
        max: 1
      });
      msgCollector.on('collect', (async collected => {
        msgCollector.stop();
        let messageContent = collected.content
          .replaceAll(`<@!${chatMsgRes.data.author.id}>`, `<@!${message.author.id}>`)
          .replace(new RegExp(chatMsgRes.data.author.username, 'i'), message.member?.nickname || message.author.username);
        if (CLYDE_BOT_REDACTED_WORDS)
          messageContent = messageContent.replace(new RegExp(CLYDE_BOT_REDACTED_WORDS, 'g'), '[REDACTED]');
        if (messageContent.length <= 2000) {
          await message.reply({ content: messageContent, allowedMentions: { repliedUser: false } });
        } else {
          const splitMessage = splitString(2000, messageContent);
          for (let i = 0; i < splitMessage.length; i++) {
            if (i === 0) {
              await message.reply({ content: splitMessage[i], allowedMentions: { repliedUser: false } });
            } else {
              await message.channel.send({ content: splitMessage[i] });
            }
          }
        }
      }));
      msgCollector.once('end', () => {
        clearInterval(sendTypingInterval);
      });
    } catch (e) {
      clearInterval(sendTypingInterval);
      throw e;
    }
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const guild = await interaction.client.guilds.fetch(CLYDE_BOT_GUILD);

    const msgChannel = await guild.channels.fetch(CLYDE_BOT_CHANNEL);

    if (!msgChannel) {
      const errorEmbedMessage = generateErrorMessage('Error configuring chat bot (reason: channel not found)');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }

    if (msgChannel.type !== ChannelType.GuildForum) {
      const errorEmbedMessage = generateErrorMessage('Error configuring chat bot (reason: invalid channel)');
      return interaction.reply({ embeds: [errorEmbedMessage] });
    }

    await interaction.deferReply();

    const savedChannel = await this.resolveChannel(interaction.user.id, interaction.user.username);

    const thread = await msgChannel.threads.fetch(savedChannel.channelId);

    if (!thread) {
      const errorEmbedMessage = generateErrorMessage('Error configuring chat bot (reason: could not find saved channel)');
      return interaction.followUp({ embeds: [errorEmbedMessage] });
    }

    const chatContent = interaction.options.getString('message', true);
    const chatMsgRes = await this.sendChatMessage(thread.id, chatContent);

    const msgCollector = new MessageCollector(thread, {
      filter: m => m.author.id === '1081004946872352958' && (!m.reference || m.reference.messageId === chatMsgRes.data.id),
      time: 300_000,
      max: 1
    });
    msgCollector.on('collect', (async collected => {
      msgCollector.stop();
      let messageContent = collected.content.replaceAll(`<@!${chatMsgRes.data.author.id}>`, `<@!${interaction.user.id}>`);
      if (CLYDE_BOT_REDACTED_WORDS)
        messageContent = messageContent.replace(new RegExp(CLYDE_BOT_REDACTED_WORDS, 'g'), '[REDACTED]');
      if (messageContent.length <= 2000) {
        await interaction.followUp({ content: messageContent, allowedMentions: { repliedUser: false } });
      } else {
        const splitMessage = splitString(2000, messageContent);
        for (let i = 0; i < splitMessage.length; i++) {
          if (i === 0) {
            await interaction.followUp({ content: splitMessage[i], allowedMentions: { repliedUser: false } });
          } else {
            await interaction.followUp({ content: splitMessage[i] });
          }
        }
      }
    }));
  }

  private async resolveChannel(userId: string, username: string) {
    let savedChannel = await clydeChannelModel.findById(userId).lean().exec();
    if (!savedChannel) {
      const createThreadRes = await selfbotService.createThread(CLYDE_BOT_CHANNEL, username, `${username}'s chat`);
      const newChannelData = new clydeChannelModel({ _id: userId, channelId: createThreadRes.data.id });
      await newChannelData.save();
      savedChannel = newChannelData.toObject();
    }
    return savedChannel;
  }

  private sendChatMessage(channelId: string, chatContent: string) {
    const content = '<@1081004946872352958> ' + chatContent;
    return selfbotService.sendChannelMessage(channelId, content);
  }
}
