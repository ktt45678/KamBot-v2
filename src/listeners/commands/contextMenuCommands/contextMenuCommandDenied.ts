import { Events, Listener, type ContextMenuCommandDeniedPayload, type UserError } from '@sapphire/framework';

import { handleChatInputOrContextMenuCommandDenied } from '../../../common/utils';

export class ContextMenuCommandDeniedListener extends Listener<typeof Events.ContextMenuCommandDenied> {
  public run(error: UserError, payload: ContextMenuCommandDeniedPayload) {
    return handleChatInputOrContextMenuCommandDenied(error, payload);
  }
}