import { AllFlowsPrecondition, ChatInputCommand, ContextMenuCommand, MessageCommand } from '@sapphire/framework';
import { CommandInteraction, ContextMenuCommandInteraction, Guild, GuildMember, Message, PermissionsBitField } from 'discord.js';

export class MusicBotPrecondition extends AllFlowsPrecondition {
  public override async chatInputRun(interaction: CommandInteraction, command: ChatInputCommand) {
    const member = interaction.member instanceof GuildMember ? interaction.member : await interaction.guild!.members.fetch(interaction.user.id);
    return this.doConditionCheck(interaction.guild!, member, command.name);
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction, command: ContextMenuCommand) {
    const member = interaction.member instanceof GuildMember ? interaction.member : await interaction.guild!.members.fetch(interaction.user.id);
    return this.doConditionCheck(interaction.guild!, member, command.name);
  }

  public override messageRun(message: Message, command: MessageCommand) {
    return this.doConditionCheck(message.guild!, message.member!, command.name);
  }

  private doConditionCheck(guild: Guild, member: GuildMember, commandName: string) {
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel)
      return this.error({ message: 'You need to be in a voice channel to use this command' });
    if (guild.members.me?.voice.channel && member.voice.channel.id !== guild.members.me.voice.channel.id)
      return this.error({ message: 'You are not in the same voice channel' });
    const permissions = voiceChannel.permissionsFor(this.container.client.user!);
    if (commandName === 'play') {
      if (!permissions || !permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak))
        return this.error({ message: 'I need the permissions to join and speak in this voice channel' });
    }
    return this.ok();
  }
}