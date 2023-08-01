import { prop, modelOptions, getModelForClass } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

@modelOptions({ schemaOptions: { timestamps: true } })
export class Profile extends TimeStamps {
  @prop({ required: true })
  _id!: string;

  @prop({ required: true, default: 0 })
  xp!: number;

  @prop({ required: true, default: 0 })
  xb!: number;

  @prop({ required: true, default: 0 })
  token!: number;

  @prop({ required: true, default: 0 })
  level!: number;

  @prop({ ref: 'fgo_servant', type: () => Number, default: [] })
  rateUpServants!: Types.Array<number>;

  @prop({ ref: 'fgo_craft_essence', type: () => Number, default: [] })
  rateUpCEs!: Types.Array<number>;
}

export const profileModel = getModelForClass(Profile, { options: { customName: 'user_profile' } });