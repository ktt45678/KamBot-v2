export interface MyFGOLoginResult {
  name: string;
  saintQuartz: number;
  freeSaintQuartz: number;
  paidSaintQuartz: number;
  level: number;
  ticket: number;
  loginDays: number;
  totalDays: number;
  apMax: number;
  apRecoverAt: number;
  currentAp: number;
  receivedFriendPoint: number;
  totalFriendPoint: number;
  bonusMessage?: string;
  bonusItems?: string[];
  bonusName?: string;
  bonusDetail?: string;
  campBonusItems?: string[];
}