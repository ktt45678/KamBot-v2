import { prop, modelOptions, getModelForClass, Ref, plugin } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { AutoIncrementID } from '@typegoose/auto-increment';

import { Profile } from '../user';

@plugin(AutoIncrementID, { startAt: 1, trackerCollection: 'counters', trackerModelName: 'counter' })
@modelOptions({ schemaOptions: { timestamps: true } })
export class AIChatMessage extends TimeStamps {
  @prop()
  _id!: number;

  @prop({ required: true, ref: () => Profile, type: () => String })
  user!: Ref<Profile, string>;

  @prop({ required: true })
  role!: string;

  @prop({ required: true })
  content!: string;
}

export const aiChatMessageModel = getModelForClass(AIChatMessage, { options: { customName: 'ai_chat_message' } });