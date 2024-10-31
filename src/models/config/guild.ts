import { prop, modelOptions, getModelForClass } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

import { DEFAULT_PREFIX } from '../../config';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Guild extends TimeStamps {
  @prop({ required: true })
  _id!: string;

  @prop({ required: true, default: DEFAULT_PREFIX })
  prefix!: string;

  @prop()
  instanceId!: string;
}

export const guildModel = getModelForClass(Guild, { options: { customName: 'config_guild' } });