import { Events, Listener, type InteractionHandlerParseError } from '@sapphire/framework';

import { handleInteractionError } from '../../common/utils';

export class InteractionHandlerParseErrorListener extends Listener<typeof Events.InteractionHandlerParseError> {
  public run(error: Error, payload: InteractionHandlerParseError) {
    return handleInteractionError(error, payload);
  }
}