import { prop, getModelForClass, Ref } from '@typegoose/typegoose';

import { Profile } from './profile';

export class Daily {
  @prop({ required: true, ref: () => Profile, type: () => String })
  _id!: Ref<Profile, string>;

  @prop({ required: true, default: Date.now })
  claimedAt!: Date;

  @prop({ required: true, default: 0, min: 0 })
  streak!: number;
}

export const dailyModel = getModelForClass(Daily, { options: { customName: 'user_daily' } });