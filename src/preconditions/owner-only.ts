import { AllFlowsPrecondition } from '@sapphire/framework';
import { CommandInteraction, ContextMenuCommandInteraction, Message, Snowflake } from 'discord.js';

import { OWNER_ID } from '../config';

export class OwnerOnlyPrecondition extends AllFlowsPrecondition {
  public override chatInputRun(interaction: CommandInteraction) {
    return this.doOwnerCheck(interaction.user.id);
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.doOwnerCheck(interaction.user.id);
  }

  public override messageRun(message: Message) {
    return this.doOwnerCheck(message.author.id);
  }

  private doOwnerCheck(userId: Snowflake) {
    if (OWNER_ID === userId)
      return this.ok();
    return this.error({ message: 'This command is owner only' });
  }
}