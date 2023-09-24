import { AutoIncrementID } from '@typegoose/auto-increment';
import { prop, getModelForClass, plugin, index } from '@typegoose/typegoose';

import { MyFGOAccountSettings } from './myfgo-account-settings';

@plugin(AutoIncrementID, { startAt: 1, trackerCollection: 'counters', trackerModelName: 'counter' })
@index({ ownerId: 1 })
@index({ displayName: 1 })
export class MyFGOAccount {
  @prop()
  _id!: number;

  @prop({ required: true })
  ownerId!: string;

  @prop({ required: true })
  accUserId!: string;

  @prop({ required: true })
  displayName!: string;

  @prop({ required: true })
  region!: string;

  @prop({ required: true })
  authKey!: string;

  @prop({ required: true })
  secretKey!: string;

  @prop({ required: true, default: 1 })
  cryptType!: number;

  @prop()
  cryptUserPassword!: string;

  @prop({ _id: false, default: () => ({}) })
  settings!: MyFGOAccountSettings;

  @prop()
  lastLogin?: Date;
}

export const myFGOAccountModel = getModelForClass(MyFGOAccount, { options: { customName: 'myfgo_account' } });