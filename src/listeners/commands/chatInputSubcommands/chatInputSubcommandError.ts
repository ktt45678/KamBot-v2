import { Listener } from '@sapphire/framework';
import { SubcommandPluginEvents, type ChatInputSubcommandErrorPayload } from '@sapphire/plugin-subcommands';

import { handleChatInputOrContextMenuCommandError } from '../../../common/utils';

export class ChatInputSubcommandErrorListener extends Listener<typeof SubcommandPluginEvents.ChatInputSubcommandError> {
  public async run(error: Error, payload: ChatInputSubcommandErrorPayload) {
    return handleChatInputOrContextMenuCommandError(error, payload);
  }
}