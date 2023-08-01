import { Events, Listener, type MessageCommandErrorPayload } from '@sapphire/framework';

import { handleMessageCommandError } from '../../../common/utils';

export class MessageCommandErrorListener extends Listener<typeof Events.MessageCommandError> {
  public async run(error: Error, payload: MessageCommandErrorPayload) {
    return handleMessageCommandError(error, payload);
  }
}