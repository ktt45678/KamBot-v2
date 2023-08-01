import { Events, Listener, type ChatInputCommandErrorPayload } from '@sapphire/framework';

import { handleChatInputOrContextMenuCommandError } from '../../../common/utils';

export class ChatInputCommandErrorListener extends Listener<typeof Events.ChatInputCommandError> {
  public async run(error: Error, payload: ChatInputCommandErrorPayload) {
    return handleChatInputOrContextMenuCommandError(error, payload);
  }
}