import { Events, Listener, type MessageCommandDeniedPayload, type UserError } from '@sapphire/framework';

import { handleMessageCommandDenied } from '../../../common/utils';

export class MessageCommandDeniedListener extends Listener<typeof Events.MessageCommandDenied> {
  public run(error: UserError, payload: MessageCommandDeniedPayload) {
    return handleMessageCommandDenied(error, payload);
  }
}