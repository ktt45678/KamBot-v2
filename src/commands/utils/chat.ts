import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Args, Command } from '@sapphire/framework';
import { ChatInputCommandInteraction, Guild, GuildMember, Message, TextBasedChannel, User } from 'discord.js';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import { aiChatMessageModel, clydeChannelModel } from '../../models';
import { openAIService, selfbotService } from '../../services';
import { createSendTypingInterval, generateErrorMessage, splitString } from '../../common/utils';
import { AI_CHAT_SYSTEM_MESSAGE, CLYDE_BOT_CHANNEL } from '../../config';
import { AiChatMessageContent } from '../../common/interfaces/utils';

@ApplyOptions<Command.Options>({
  name: 'chat',
  aliases: ['gpt', 'clyde'],
  fullCategory: ['Utility'],
  description: 'Chat with AI'
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

    const sendTypingInterval = await createSendTypingInterval(message.channel);

    try {
      const chatContent = await args.rest('string');
      const attachmentUrls = await this.extractAttachmentsFromMessage(message);
      const referenceContentList = await this.extractReferenceFromMessage(message);

      let completionContent: AiChatMessageContent;
      if (attachmentUrls.length) {
        completionContent = [];
        completionContent.push({ type: 'text', text: chatContent });
        for (let i = 0; i < attachmentUrls.length; i++) {
          completionContent.push({ type: 'image_url', image_url: { url: attachmentUrls[i] } });
        }
      } else {
        completionContent = chatContent;
      }

      const oldChatMessages = await aiChatMessageModel.find(
        { user: message.author.id, role: { $ne: 'system' } }, {}, { sort: { createdAt: -1 }, limit: 10, lean: true }
      ).exec();

      const completionRequestMessages: ChatCompletionMessageParam[] = [];

      const systemMessageContent = this.createSystemMessage({
        guild: message.guild,
        member: message.member,
        channel: message.channel,
        user: message.author
      });

      completionRequestMessages.push({
        role: 'system',
        content: systemMessageContent
      });

      for (let i = oldChatMessages.length - 1; i >= 0; i--) {
        completionRequestMessages.push({ role: <any>oldChatMessages[i].role, content: oldChatMessages[i].content });
      }

      const userChatMessage = new aiChatMessageModel({
        user: message.author.id,
        role: 'user',
        content: completionContent
      });

      completionRequestMessages.push({ role: <any>userChatMessage.role, content: userChatMessage.content });

      let referenceChatMessage;

      if (referenceContentList.length) {
        referenceChatMessage = new aiChatMessageModel({
          user: message.author.id,
          role: 'system',
          content: `The user is referring to this in particular:\n${referenceContentList.join('\n')}`
        });
        completionRequestMessages.push({ role: <any>referenceChatMessage.role, content: referenceChatMessage.content });
      }

      const chatResponse = await openAIService.createChatCompletion(completionRequestMessages, 'gpt-4o');

      const messageContent = chatResponse.choices.find(r => r.finish_reason != null)?.message?.content;

      if (!messageContent) {
        const errorEmbedMessage = generateErrorMessage('The bot did not respond');
        return message.channel.send({ embeds: [errorEmbedMessage] });
      }

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

      const repliedChatMessage = new aiChatMessageModel({
        user: message.author.id,
        role: 'assistant',
        content: messageContent
      });

      await userChatMessage.save();
      if (referenceChatMessage) {
        await referenceChatMessage.save();
      }
      await repliedChatMessage.save();
    } catch (e) {
      throw e;
    } finally {
      clearInterval(sendTypingInterval);
    }
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const chatContent = interaction.options.getString('message', true);
      await interaction.deferReply();

      const oldChatMessages = await aiChatMessageModel.find(
        { user: interaction.user.id }, {}, { sort: { createdAt: -1 }, limit: 50, lean: true }
      ).exec();

      const completionRequestMessages: ChatCompletionMessageParam[] = [];

      const systemMessageContent = this.createSystemMessage({
        guild: interaction.guild,
        member: <GuildMember>interaction.member!,
        channel: interaction.channel!,
        user: interaction.user
      });

      completionRequestMessages.push({
        role: 'system',
        content: systemMessageContent
      });

      for (let i = oldChatMessages.length - 1; i >= 0; i--) {
        completionRequestMessages.push({ role: <any>oldChatMessages[i].role, content: oldChatMessages[i].content });
      }

      const userChatMessage = new aiChatMessageModel({
        user: interaction.user.id,
        role: 'user',
        content: chatContent
      });

      completionRequestMessages.push({ role: <any>userChatMessage.role, content: userChatMessage.content });

      const chatResponse = await openAIService.createChatCompletion(completionRequestMessages, 'gpt-4o');

      const messageContent = chatResponse.choices.find(r => r.finish_reason != null)?.message?.content;

      if (!messageContent) {
        const errorEmbedMessage = generateErrorMessage('The bot did not respond');
        return interaction.followUp({ embeds: [errorEmbedMessage] });
      }

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

      const repliedChatMessage = new aiChatMessageModel({
        user: interaction.user.id,
        role: 'assistant',
        content: messageContent
      });

      await userChatMessage.save();
      await repliedChatMessage.save();
    } catch (e) {
      throw e;
    }
  }

  private async extractAttachmentsFromMessage(message: Message) {
    const urls: string[] = [];

    if (message.attachments.size) {
      message.attachments.forEach(attachment => {
        urls.push(attachment.url);
      });
    }

    if (message.embeds.length) {
      message.embeds.forEach(embed => {
        if (embed.image)
          urls.push(embed.image.url);
        if (embed.thumbnail)
          urls.push(embed.thumbnail.url);
      });
    }

    if (message.reference?.messageId) {
      const refMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMessage) {
        if (refMessage.attachments.size) {
          refMessage.attachments.forEach(attachment => {
            urls.push(attachment.url);
          });
        }
        else if (refMessage.embeds.length) {
          refMessage.embeds.forEach(embed => {
            if (embed.image)
              urls.push(embed.image.url);
            if (embed.thumbnail)
              urls.push(embed.thumbnail.url);
          });
        }
      }
    }

    return urls;
  }

  private async extractReferenceFromMessage(message: Message) {
    const referenceContent: string[] = [];
    if (message.embeds.length) {
      message.embeds.forEach(embed => {
        let content = '';
        if (embed.title)
          content += `\n${embed.title}`;
        if (embed.description)
          content += `\n${embed.description}`;
        if (embed.url)
          content += `\n${embed.url}`;
        referenceContent.push(content);
      });
    }

    if (message.reference?.messageId) {
      const refMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMessage) {
        if (refMessage.content) {
          let content = refMessage.content;
          referenceContent.push(content);
        }
        if (refMessage.embeds.length) {
          refMessage.embeds.forEach(embed => {
            let content = '';
            if (embed.title)
              content += `\n${embed.title}`;
            if (embed.description)
              content += `\n${embed.description}`;
            if (embed.url)
              content += `\n${embed.url}`;
            referenceContent.push(content);
          });
        }
      }
    }

    return referenceContent;
  }

  private createSystemMessage(options: { guild: Guild | null, member: GuildMember | null, channel: TextBasedChannel, user: User }) {
    const { guild, member, channel, user } = options;
    let messageContent = AI_CHAT_SYSTEM_MESSAGE + '\n';
    if (guild && member && !channel.isDMBased()) {
      messageContent += `You are in a discord server called \`${guild.name}\`, the message channel name is \`${channel.name}\`, `;
      messageContent += `the user chatting with you is \`${member.nickname || member.displayName}\`, his/her username is \`${user.username}\`, `;
      messageContent += `you can use this syntax <@${user.id}> to mention/ping this user in here\n`;
    } else if (channel.isDMBased()) {
      messageContent += `You are in a direct message channel, the user chatting with you is \`${user.username}\`, `;
      messageContent += `you can use this syntax <@${user.id}> to mention/ping this user in here\n`
    }
    return messageContent;
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
