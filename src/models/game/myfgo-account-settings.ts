import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { _id: false } })
export class MyFGOAccountSettings {
  @prop()
  autoLogin?: boolean;

  @prop()
  autoLoginActions?: number;

  @prop()
  loginActions?: number;

  @prop()
  autoLoginInterval?: number | null;

  @prop()
  autoLoginExpiry?: Date | null;
}
