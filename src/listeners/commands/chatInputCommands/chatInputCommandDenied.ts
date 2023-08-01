import { Events, Listener, type ChatInputCommandDeniedPayload, type UserError } from '@sapphire/framework';

import { handleChatInputOrContextMenuCommandDenied } from '../../../common/utils';

export class ChatInputCommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
  public run(error: UserError, payload: ChatInputCommandDeniedPayload) {
    return handleChatInputOrContextMenuCommandDenied(error, payload);
  }
}