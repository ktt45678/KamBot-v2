import { prop, getModelForClass, index } from '@typegoose/typegoose';

import { IMAGEKIT_URL } from '../../config';

@index({ name: 1 })
export class FGOCraftEssence {
  @prop({ required: true })
  _id!: number;

  @prop({ required: true })
  name!: string;

  @prop({ required: true })
  type!: string;

  @prop({ required: true })
  flag!: string;

  @prop({ required: true })
  rarity!: number;

  @prop({ required: true })
  facePath!: string;

  public get face() {
    return `${IMAGEKIT_URL}/${this.facePath}`;
  }
}

export const fgoCraftEssenceModel = getModelForClass(FGOCraftEssence, { options: { customName: 'fgo_craft_essence' } });