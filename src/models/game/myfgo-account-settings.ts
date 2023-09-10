import { modelOptions, prop } from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { _id: true } })
export class MyFGOAccountSettings {
  @prop()
  autoDaily?: boolean;

  @prop()
  autoDailyActions?: number;

  @prop()
  loginActions?: number;
}
