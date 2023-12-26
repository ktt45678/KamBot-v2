import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { _id: false } })
export class MyFGOAccountSettings {
  @prop()
  autoLogin?: boolean;

  @prop()
  autoLoginActions?: number;

  @prop()
  loginActions?: number;

  @prop({ type: Number })
  autoLoginInterval?: number | null;

  @prop({ type: Date })
  autoLoginExpiry?: Date | null;
}
