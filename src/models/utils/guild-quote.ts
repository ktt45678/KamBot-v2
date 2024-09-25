import { prop, modelOptions, getModelForClass, Ref, plugin } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { Schema } from 'mongoose';

import { Guild } from '../config';
import { Profile } from '../user';
import { QuoteMessage } from '../../common/interfaces/utils';

@plugin(AutoIncrementID, { startAt: 1000, trackerCollection: 'counters', trackerModelName: 'counter' })
@modelOptions({ schemaOptions: { timestamps: true } })
export class GuildQuote extends TimeStamps {
  @prop()
  _id!: number;

  @prop({ required: true, unique: true })
  nanoId!: string;

  @prop({ required: true, ref: () => Guild, type: () => String })
  guild!: Ref<Guild, string>;

  @prop({ required: true, ref: () => Profile, type: () => String })
  author!: Ref<Profile, string>;

  @prop({ required: true })
  name!: string;

  @prop({ type: Schema.Types.Mixed, required: true })
  content!: QuoteMessage;
}

export const guildQuoteModel = getModelForClass(GuildQuote, { options: { customName: 'guild_quote' } });