import { prop, modelOptions, getModelForClass } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

@modelOptions({ schemaOptions: { timestamps: true } })
export class ClydeChannel extends TimeStamps {
  @prop({ required: true })
  _id!: string;

  @prop({ required: true })
  channelId!: string;
}

export const clydeChannelModel = getModelForClass(ClydeChannel, { options: { customName: 'clyde_channel' } });