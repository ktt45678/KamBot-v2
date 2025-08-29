import { container, type ChatInputCommandDeniedPayload, type ContextMenuCommandDeniedPayload, type MessageCommandDeniedPayload, type MessageCommandErrorPayload, UserError, type ContextMenuCommandErrorPayload, type ChatInputCommandErrorPayload, InteractionHandlerError, InteractionHandlerParseError, ArgumentError } from '@sapphire/framework';
import { Client, DiscordAPIError, EmbedBuilder, Events, HTTPError, Interaction, RESTJSONErrorCodes, WebhookClient } from 'discord.js';
import { ChatInputSubcommandErrorPayload, MessageSubcommandErrorPayload } from '@sapphire/plugin-subcommands';

import { generateErrorMessage } from './discord';
import { DiscordEmbedError } from './discord-embed-error';
import { WEBHOOK_LOG_URL } from '../../config';
import { EmbedColors } from '../enums';

export function handleChatInputOrContextMenuCommandDenied(error: UserError, payload: ChatInputCommandDeniedPayload | ContextMenuCommandDeniedPayload) {
  if (Reflect.get(Object(payload.context), 'silent')) return;

  const errorEmbedMessage = generateErrorMessage(error.message, 'Failed to execute the command!');
  if (payload.interaction.replied || payload.interaction.deferred)
    return payload.interaction.followUp({ embeds: [errorEmbedMessage] });
  return payload.interaction.reply({ embeds: [errorEmbedMessage] });
}

export function handleMessageCommandDenied(error: UserError, payload: MessageCommandDeniedPayload) {
  if (Reflect.get(Object(payload.context), 'silent')) return;
  if (!payload.message.channel.isSendable()) return;

  const errorEmbedMessage = generateErrorMessage(error.message, 'Failed to execute the command!');
  return payload.message.channel.send({ embeds: [errorEmbedMessage] });
}

export async function handleChatInputOrContextMenuCommandError(error: Error, payload: ChatInputCommandErrorPayload | ContextMenuCommandErrorPayload | ChatInputSubcommandErrorPayload) {
  if (error instanceof DiscordEmbedError) {
    if (payload.interaction.replied || payload.interaction.deferred)
      return payload.interaction.followUp({ embeds: [error.toEmbed()] });
    else
      return payload.interaction.reply({ embeds: [error.toEmbed()] });
  }
  const errorEmbedMessage = generateErrorMessage('An unexpected error has occurred, please try again later or send a bug report', 'Error trying to execute the command!');
  const paramsString = payload.interaction.options.data.map(d => {
    const displayValue = d.value || `(${d.type})`;
    return `${d.name}:${displayValue}`;
  }).join(' ');
  const inputCommand = '/' + payload.interaction.commandName + ' ' + paramsString;
  let sendMessagePromise: Promise<unknown>;
  if (payload.interaction.replied || payload.interaction.deferred)
    sendMessagePromise = payload.interaction.followUp({ embeds: [errorEmbedMessage] });
  else
    sendMessagePromise = payload.interaction.reply({ embeds: [errorEmbedMessage] });
  await Promise.all([
    sendMessagePromise,
    sendWebhookCommandErrorMessage(error, 'Error trying to execute the command!', inputCommand, payload.interaction.client)
  ]);
}

export async function handleMessageCommandError(error: Error, payload: MessageCommandErrorPayload | MessageSubcommandErrorPayload) {
  if (!payload.message.channel.isSendable()) return;
  if (error instanceof DiscordEmbedError) {
    return payload.message.channel.send({ embeds: [error.toEmbed()] });
  }
  const errorEmbedMessage = generateErrorMessage('An unexpected error has occurred, please try again later or send a bug report', 'Error trying to execute the command!');
  await Promise.all([
    payload.message.channel.send({ embeds: [errorEmbedMessage] }),
    sendWebhookCommandErrorMessage(error, 'Error trying to execute the command!', payload.message.content, payload.message.client)
  ]);
}

export async function handleInteractionError(error: Error, { handler, interaction }: InteractionHandlerError | InteractionHandlerParseError) {
  const ignoredCodes = [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.UnknownMessage];
  // If the error was a string or an UserError, send it to the user:
  if (typeof error === 'string') {
    const embedErrorMessage = generateErrorMessage(error);
    return sendInteractionErrorMessage(interaction, embedErrorMessage);
  }
  if (error instanceof DiscordEmbedError) {
    return sendInteractionErrorMessage(interaction, error.toEmbed());
  }
  if (error instanceof ArgumentError) {
    const embedErrorMessage = generateErrorMessage(error.message || 'Argument error');
    return sendInteractionErrorMessage(interaction, embedErrorMessage);
  }
  if (error instanceof UserError) {
    if (Reflect.get(Object(error.context), 'silent')) return;
    const embedErrorMessage = generateErrorMessage(error.message || 'User error');
    return sendInteractionErrorMessage(interaction, embedErrorMessage);
  }

  const { client, logger } = container;
  // If the error was an AbortError or an Internal Server Error, tell the user to re-try:
  if (error.name === 'AbortError' || error.message === 'Internal Server Error') {
    logger.warn(`ERROR: ${interaction.guildId}/${interaction.channelId}/${interaction.id} (${interaction.user.id}) | ${error.constructor.name}`);
    const embedErrorMessage = generateErrorMessage('Network error detected. Please try running this command again!');
    return sendInteractionErrorMessage(interaction, embedErrorMessage);
  }

  // Extract useful information about the DiscordAPIError
  if (error instanceof DiscordAPIError || error instanceof HTTPError) {
    if (ignoredCodes.includes(error.status)) {
      return;
    }

    client.emit(Events.Error, error);
  } else {
    logger.warn(`ERROR: ${interaction.guildId}/${interaction.channelId}/${interaction.id} (${interaction.user.id}) | ${error.constructor.name}`);
  }

  // Emit where the error was emitted
  logger.fatal(`[COMMAND] ${handler.location.full}\n${error.stack || error.message}`);
  try {
    const embedErrorMessage = generateErrorMessage('An unexpected error has occurred, please try again later or send a bug report');
    const interactionInput = `Interaction id ${interaction.id}`;
    await Promise.all([
      sendInteractionErrorMessage(interaction, embedErrorMessage),
      sendWebhookCommandErrorMessage(error, 'Error trying to execute the command!', interactionInput, interaction.client)
    ]);
  } catch (err) {
    client.emit(Events.Error, err as Error);
  }
}

export async function sendWebhookCommandErrorMessage(error: Error, errorMessage: string, input: string, client: Client<true>) {
  if (!WEBHOOK_LOG_URL) return;
  const webhookClient = new WebhookClient({ url: WEBHOOK_LOG_URL });
  let webhookMessageContent = `**${errorMessage}**\n`;
  webhookMessageContent += `${error.name}: ${error.message}\n`;
  webhookMessageContent += `Input: ${input}\n`;
  error.cause && (webhookMessageContent += `Cause: ${error.cause}\n`);
  error.stack && (webhookMessageContent += `Stack trace:\n${error.stack}`);
  const webhookEmbedMessage = new EmbedBuilder()
    .setColor(EmbedColors.Error)
    .setAuthor({ name: client.user.tag, iconURL: client.user.displayAvatarURL({ forceStatic: true, size: 128 }) })
    .setDescription(webhookMessageContent)
  return webhookClient.send({
    avatarURL: container.client.user?.displayAvatarURL({ forceStatic: false, size: 256 }),
    embeds: [webhookEmbedMessage]
  });
}

function sendInteractionErrorMessage(interaction: Interaction, embed: EmbedBuilder) {
  if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ embeds: [embed] });
  }

  return interaction.reply({ embeds: [embed], ephemeral: true });
}