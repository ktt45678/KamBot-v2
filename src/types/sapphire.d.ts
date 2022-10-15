import '@sapphire/pieces';

declare module '@sapphire/pieces' {
  interface Container {
    discordTogether: import('discord-together').DiscordTogether<{ [x: string]: string; }>;
  }
}