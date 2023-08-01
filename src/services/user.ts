import { DailyConfig } from '../common/configs';
import { ClaimDailyResult } from '../common/interfaces/user';
import { Daily, dailyModel, profileModel } from '../models';

export class UserService {
  findDaily(id: string) {
    return dailyModel.findOne({ _id: id }).lean().exec();
  }

  findProfile(id: string) {
    return profileModel.findOne({ _id: id }).lean().exec();
  }

  async claimDailyReward(targetId: string, authorId: string, dailyData?: Daily | null): Promise<ClaimDailyResult> {
    dailyData = dailyData || await this.findDaily(authorId);
    const { DailyXBDefault, DailyXBExtra, DailyXBStreak, DailyTokenStreak, MaxStreak } = DailyConfig;
    const xb = DailyXBDefault;
    const streak = dailyData?.streak ? dailyData.streak < MaxStreak ? dailyData.streak + 1 : 1 : 1;
    const streakXb = streak === MaxStreak
      ? Math.floor(Math.random() * (DailyXBStreak.Max - DailyXBStreak.Min + 1) + DailyXBStreak.Min)
      : 0;
    const token = streak === MaxStreak ? DailyTokenStreak : 0;
    if (targetId !== authorId) {
      const extraXb = Math.floor(Math.random() * (DailyXBExtra.Max - DailyXBExtra.Min + 1) + DailyXBExtra.Min);
      const targetXb = xb + extraXb;
      await Promise.all([
        dailyModel.bulkWrite([
          { updateOne: { filter: { _id: targetId }, update: {}, upsert: true } },
          { updateOne: { filter: { _id: authorId }, update: { $set: { claimedAt: new Date(), streak } }, upsert: true } },
        ]),
        profileModel.bulkWrite([
          { updateOne: { filter: { _id: targetId }, update: { $inc: { xb: targetXb, token } }, upsert: true } },
          { updateOne: { filter: { _id: authorId }, update: { $inc: { xb: streakXb, token } }, upsert: true } },
        ])
      ]);
      // await Promise.all([
      //   dailyModel.findOneAndUpdate({ _id: targetId }, {}, { upsert: true }),
      //   dailyModel.findOneAndUpdate({ _id: authorId }, { claimedAt: Date.now(), streak }, { upsert: true }),
      //   profileModel.findOneAndUpdate({ _id: targetId }, { $inc: { xb: targetXb, token } }, { upsert: true }),
      //   profileModel.findOneAndUpdate({ _id: authorId }, { $inc: { xb: streakXb, token } }, { upsert: true })
      // ]);
      return { xb, targetXb, streakXb, token, streak };
    } else {
      const totalXb = xb + streakXb;
      await Promise.all([
        dailyModel.updateOne({ _id: targetId }, { $set: { claimedAt: Date.now(), streak } }, { upsert: true }).exec(),
        profileModel.updateOne({ _id: targetId }, { $inc: { xb: totalXb, token } }, { upsert: true }).exec()
      ]);
      return { xb, streakXb, token, streak };
    }
  }
}

export const userService = new UserService();
