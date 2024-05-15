import { prop, modelOptions, getModelForClass, Ref, plugin } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { Schema } from 'mongoose';

import { Profile } from '../user';
import { AiChatMessageContent } from '../../common/interfaces/utils';

@plugin(AutoIncrementID, { startAt: 1, trackerCollection: 'counters', trackerModelName: 'counter' })
@modelOptions({ schemaOptions: { timestamps: true } })
export class AIChatMessage extends TimeStamps {
  @prop()
  _id!: number;

  @prop({ required: true, ref: () => Profile, type: () => String })
  user!: Ref<Profile, string>;

  @prop({ required: true })
  role!: string;

  @prop({ type: Schema.Types.Mixed, required: true })
  content!: AiChatMessageContent;
}

export const aiChatMessageModel = getModelForClass(AIChatMessage, { options: { customName: 'ai_chat_message' } });