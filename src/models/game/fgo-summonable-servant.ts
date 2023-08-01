import { prop, getModelForClass, plugin, index, Ref } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';

import { FGOServant } from './fgo-servant';

@plugin(AutoIncrementID, { startAt: 1, trackerCollection: 'counters', trackerModelName: 'counter' })
@index({ servant: 1 }, { unique: true })
export class FGOSummonableServant {
  @prop()
  _id!: number;

  @prop({ required: true, ref: 'fgo_servant', type: () => Number })
  servant!: Ref<FGOServant, number>;

  @prop({ required: true })
  limited!: boolean;
}

export const fgoSummonableServantModel = getModelForClass(FGOSummonableServant, { options: { customName: 'fgo_summonable_servant' } });