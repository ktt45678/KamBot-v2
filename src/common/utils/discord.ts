import { EmbedBuilder, GuildMemberManager, TextBasedChannel } from 'discord.js';

import { EmbedColors } from '../enums';

export async function findMemberInGuild(members: GuildMemberManager, name: string) {
  if (!isNaN(<any>name)) {
    const member = await members.fetch(name);
    return member;
  }
  const memberList = await members.fetch({ query: name, limit: 1 });
  return memberList.first() || null;
}

export function generateInfoMessage(message: string, title = 'Info!') {
  return new EmbedBuilder()
    .setColor(EmbedColors.Info)
    .setTitle(title)
    .setDescription(message);
}

export function generateErrorMessage(message: string, title = 'An error occurred!') {
  return new EmbedBuilder()
    .setColor(EmbedColors.Error)
    .setTitle(title)
    .setDescription(message);
}

export async function createSendTypingInterval(channel: TextBasedChannel) {
  await channel.sendTyping();
  return setInterval(() => {
    return channel.sendTyping();
  }, 10_000);
}