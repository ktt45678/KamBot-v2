import { Events, Listener, type ContextMenuCommandErrorPayload } from '@sapphire/framework';

import { handleChatInputOrContextMenuCommandError } from '../../../common/utils';

export class ContextMenuCommandErrorListener extends Listener<typeof Events.ContextMenuCommandError> {
  public async run(error: Error, payload: ContextMenuCommandErrorPayload) {
    return handleChatInputOrContextMenuCommandError(error, payload);
  }
}