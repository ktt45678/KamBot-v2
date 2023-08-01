import { prop, getModelForClass, plugin, index, Ref } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';

import { FGOCraftEssence } from './fgo-craft-essence';

@plugin(AutoIncrementID, { startAt: 1, trackerCollection: 'counters', trackerModelName: 'counter' })
@index({ ce: 1 }, { unique: true })
export class FGOSummonableCE {
  @prop()
  _id!: number;

  @prop({ required: true, ref: 'fgo_craft_essence', type: () => Number })
  ce!: Ref<FGOCraftEssence, number>;

  @prop({ required: true })
  limited!: boolean;
}

export const fgoSummonableCEModel = getModelForClass(FGOSummonableCE, { options: { customName: 'fgo_summonable_ce' } });