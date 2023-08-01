import { AllFlowsPrecondition, MessageCommand, MessageCommandContext, Piece, PreconditionContext } from '@sapphire/framework';
import { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';

export class MentionPrefixPrecondition extends AllFlowsPrecondition {
  constructor(context: Piece.Context, options: AllFlowsPrecondition.Options) {
    super(context, { ...options, position: 20 });
  }

  public override chatInputRun(interaction: CommandInteraction) {
    return this.ok();
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.ok();
  }

  public override messageRun(message: Message, command: MessageCommand, context: PreconditionContext) {
    const prefix = (<MessageCommandContext>context.context)?.prefix;
    if (`<@${this.container.client.id}>` === prefix) {
      message.mentions.users.delete(this.container.client.id!);
      message.mentions.parsedUsers.delete(this.container.client.id!);
      message.mentions.members?.delete(this.container.client.id!);
    }
    return this.ok();
  }
}