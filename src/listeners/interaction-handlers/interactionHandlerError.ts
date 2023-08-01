import { Events, Listener, type InteractionHandlerError } from '@sapphire/framework';

import { handleInteractionError } from '../../common/utils';

export class InteractionHandlerErrorListener extends Listener<typeof Events.InteractionHandlerError> {
  public run(error: Error, payload: InteractionHandlerError) {
    return handleInteractionError(error, payload);
  }
}