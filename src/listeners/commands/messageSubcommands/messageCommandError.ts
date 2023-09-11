import { Listener } from '@sapphire/framework';
import { SubcommandPluginEvents, type MessageSubcommandErrorPayload } from '@sapphire/plugin-subcommands';

import { handleMessageCommandError } from '../../../common/utils';

export class MessageCommandErrorListener extends Listener<typeof SubcommandPluginEvents.MessageSubcommandError> {
  public async run(error: Error, payload: MessageSubcommandErrorPayload) {
    return handleMessageCommandError(error, payload);
  }
}