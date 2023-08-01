import { prop, modelOptions, getModelForClass, plugin, ReturnModelType } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { AutoIncrementID } from '@typegoose/auto-increment';

@modelOptions({ schemaOptions: { timestamps: true } })
@plugin(AutoIncrementID, { startAt: 1, trackerCollection: 'counters', trackerModelName: 'counter' })
export class GifImage extends TimeStamps {
  @prop()
  _id!: number;

  @prop({ required: true })
  url!: string;

  @prop({ required: true, enum: ['slap', 'godit'] })
  kind!: string;

  @prop()
  comment?: string;

  public static async findOneRandomGif(this: ReturnModelType<typeof GifImage>, kind: string): Promise<GifImage> {
    const [result] = await this.aggregate([{ $match: { kind } }, { $sample: { size: 1 } }]);
    return result;
  }
}

export const gifImageModel = getModelForClass(GifImage, { options: { customName: 'fun_gif_image' } });