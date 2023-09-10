// General response
export interface FGOAssetAPIResponse {
  response: FGOAssetAPIResponseData[];
}

export interface FGOAssetAPIResponseData {
  resCode: string;
  success: FGOAssetAPIResponseSuccess;
  fail: FGOAssetAPIResponseFail;
  nid: string;
}

export interface FGOAssetAPIResponseFail {
  detail: string;
}

export interface FGOAssetAPIResponseSuccess {

}

// Top login response
export interface FGOTopLoginResponse {
  response: Response[];
  cache: Cache;
}

export interface Cache {
  updated: Updated;
  deleted: Deleted;
  replaced: Replaced;
  serverTime: number;
}

export interface Deleted {
}

export interface Replaced {
  userSvtCollection: UserSvtCollection[];
  userEventPoint: UserEventPoint[];
  userGachaExtraCount: UserGachaExtraCount[];
  userSvtStorage: { [key: string]: number }[];
  userSvtVoicePlayed: UserSvt[];
  userQuest: UserQuest[];
  userCommandCode: UserCommandCode[];
  userEventMissionFix: UserEventMissionFix[];
  userEventMission: UserEventMission[];
  userSvt: { [key: string]: number }[];
  userPrivilege: UserPrivilege[];
  userEquip: UserEquip[];
  tblUserGame: TblUserGame[];
  userCommandCodeCollection: UserCommandCode[];
  userSvtAppendPassiveSkill: UserSvtAppendPassiveSkill[];
  userEventMissionConditionDetail: UserEventMissionConditionDetail[];
  userQuestRoute: UserQuestRoute[];
  userPresentBox: UserPresentBox[];
  userNpcSvtRecord: UserNpcSvtRecord[];
  userSupportDeck: UserSupportDeck[];
  userEventRaid: UserEventRAID[];
  userDeck: UserDeck[];
  userSvtCoin: User[];
  userItem: User[];
  userQuestInfo: UserQuestInfo[];
  userSvtLeader: UserSvtLeader[];
  userGacha: UserGacha[];
  userEvent: UserEvent[];
  userSvtCommandCard: UserSvt[];
  userGame: UserGame[];
  userSvtCommandCode: UserSvt[];
  userSvtAppendPassiveSkillLv: UserSvtAppendPassiveSkillLV[];
  globalUser: GlobalUser[];
  beforeBirthDay: BeforeBirthDay[];
  userGachaDrawLog: any[];
}

export interface BeforeBirthDay {
  oldBirthDay: number;
}

export interface GlobalUser {
  userId: number;
  optOut: boolean;
}

export interface TblUserGame {
  userId: number;
  friendPoint: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserCommandCode {
  id?: number;
  userId: number;
  commandCodeId: number;
  status: number;
  createdAt: number;
  updatedAt: number;
  getNum?: number;
}

export interface UserDeck {
  deckInfo: DeckInfo;
  id: number;
  userId: number;
  deckNo: number;
  name: string;
  cost: number;
}

export interface DeckInfo {
  svts: Svt[];
  userEquipId: number;
}

export interface Svt {
  id: number;
  userSvtId: number;
  userSvtEquipIds: number[];
  isFollowerSvt: boolean;
  npcFollowerSvtId: number;
}

export interface UserEquip {
  id: number;
  userId: number;
  equipId: number;
  lv: number;
  exp: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserEvent {
  userId: number;
  eventId: number;
  value: number;
  flag: number;
  tutorial: number;
  scriptFlag: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserEventMission {
  userId: number;
  missionId: number;
  missionTargetId: number;
  missionProgressType: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserEventMissionConditionDetail {
  userId: number;
  conditionDetailId: number;
  missionTargetId: number;
  progressNum: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserEventMissionFix {
  userId: number;
  missionId: number;
  progressType: number;
  num: number;
}

export interface UserEventPoint {
  userId: number;
  eventId: number;
  groupId: number;
  value: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserEventRAID {
  userId: number;
  eventId: number;
  day: number;
  damage: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserGacha {
  userId: number;
  gachaId: number;
  num: number;
  freeDrawAt: number;
  status: number;
}

export interface UserGachaExtraCount {
  userId: number;
  extraGroupId: number;
  count: number;
}

export interface UserGame {
  fixMainSupportDeckIds: number[];
  fixEventSupportDeckIds: number[];
  message: string;
  stone: number;
  friendKeep: number;
  svtKeep: number;
  svtEquipKeep: number;
  userId: number;
  name: string;
  birthDay: number;
  actMax: number;
  actRecoverAt: number;
  carryOverActPoint: number;
  rpRecoverAt: number;
  carryOverRaidPoint: number;
  genderType: number;
  lv: number;
  exp: number;
  qp: number;
  costMax: number;
  friendCode: string;
  favoriteUserSvtId: number;
  pushUserSvtId: number;
  flag: number;
  commandSpellRecoverAt: number;
  svtStorageAdjust: number;
  svtEquipStorageAdjust: number;
  userEquipId: number;
  freeStone: number;
  chargeStone: number;
  mana: number;
  rarePri: number;
  activeDeckId: number;
  mainSupportDeckId: number;
  eventSupportDeckId: number;
  tutorial1: number;
  tutorial2: number;
  updatedAt: number;
  createdAt: number;
}

export interface User {
  userId: number;
  itemId?: number;
  num: number;
  updatedAt: number;
  createdAt: number;
  svtId?: number;
}

export interface UserNpcSvtRecord {
  tdPlayed: number[];
  userId: number;
  svtId: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserPresentBox {
  receiveUserId: number;
  presentId: number;
  messageRefType: number;
  messageId: number;
  message: string;
  fromType: number;
  giftType: number;
  objectId: number;
  num: number;
  limitCount: number;
  lv: number;
  flag: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserPrivilege {
  userId: number;
  privilegeId: number;
  startedAt: number;
  num: number;
}

export interface UserQuest {
  userId: number;
  questId: number;
  questPhase: number;
  clearNum: number;
  isEternalOpen: boolean;
  expireAt: number;
  challengeNum: number;
  isNew: boolean;
  lastStartedAt: number;
  status: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserQuestInfo {
  dropSvtIds: number[];
  dropItemIds: number[];
  enemyIds: number[];
  userId: number;
  questId: number;
  eventId: number;
}

export interface UserQuestRoute {
  userId: number;
  questId: number;
  routeId: number;
}

export interface UserSupportDeck {
  userId: number;
  supportDeckId: number;
  name: string;
}

export interface UserSvtAppendPassiveSkill {
  unlockNums: number[];
  userId: number;
  svtId: number;
}

export interface UserSvtAppendPassiveSkillLV {
  appendPassiveSkillNums: number[];
  appendPassiveSkillLvs: number[];
  userSvtId: number;
  userId: number;
}

export interface UserSvtCollection {
  dateTimeOfGachas: null;
  tdPlayed: number[];
  costumeIds: number[];
  releasedCostumeIds: number[];
  commandCodes: null;
  commandCardParams: null;
  userId: number;
  svtId: number;
  status: number;
  maxLv: number;
  maxHp: number;
  maxAtk: number;
  maxLimitCount: number;
  skillLv1: number;
  skillLv2: number;
  skillLv3: number;
  treasureDeviceLv1: number;
  svtCommonFlag: number;
  flag: number;
  friendship: number;
  friendshipRank: number;
  friendshipExceedCount: number;
  voicePlayed: number;
  voicePlayed2: number;
  getNum: number;
  totalGetNum: number;
  updatedAt: number;
  createdAt: number;
}

export interface UserSvt {
  commandCardParam?: number[];
  userId: number;
  svtId: number;
  createdAt: number;
  userCommandCodeIds?: number[];
  voicePlayed?: number[];
}

export interface UserSvtLeader {
  dispLimitCount: number;
  imageLimitCount: number;
  commandCardLimitCount: number;
  iconLimitCount: number;
  portraitLimitCount: number;
  battleVoice: number;
  randomLimitCountTargets: any[];
  classPassive: any[];
  equipTarget1: { [key: string]: number };
  commandCode: CommandCode[];
  commandCardParam: number[];
  appendPassiveSkill: AppendPassiveSkill[];
  script: Deleted;
  eventSvtPoint: number;
  userId: number;
  supportDeckId: number;
  classId: number;
  userSvtId: number;
  svtId: number;
  limitCount: number;
  lv: number;
  exp: number;
  hp: number;
  atk: number;
  adjustHp: number;
  adjustAtk: number;
  skillId1: number;
  skillId2: number;
  skillId3: number;
  skillLv1: number;
  skillLv2: number;
  skillLv3: number;
  treasureDeviceId: number;
  treasureDeviceLv: number;
  exceedCount: number;
  updatedAt: number;
}

export interface AppendPassiveSkill {
  skillId: number;
  skillLv: number;
}

export interface CommandCode {
  idx: number;
  commandCodeId: number;
  userCommandCodeId: number;
}

export interface Updated {
  userEventDeck: UserEventDeck[];
  mstTotalLogin: MstTotalLogin[];
  userLogin: UserLogin[];
  userShop: UserShop[];
  userContinue: UserContinue[];
}

export interface MstTotalLogin {
  eventId: number;
  day: number;
  script: string;
}

export interface UserContinue {
  userId: number;
  isDel: number;
  continueKey: string;
}

export interface UserEventDeck {
  deckInfo: DeckInfo;
  userId: number;
  eventId: number;
  deckNo: number;
}

export interface UserLogin {
  userId: number;
  seqLoginCount: number;
  totalLoginCount: number;
  lastLoginAt: number;
  createdAt: number;
}

export interface UserShop {
  userId: number;
  shopId: number;
  num: number;
  flag: number;
  updatedAt: number;
}

export interface Response extends FGOAssetAPIResponseData {
  success: Success;
}

export interface Success {
  topAddFriendPointSvt?: TopAddFriendPointSvt;
  addFriendPoint?: number;
  obfuscatedAccountId?: string;
  topAddFriendPointSvtEQ?: TopAddFriendPointSvt;
  addFollowFriendPoint?: number;
  seqLoginBonus?: SeqLoginBonus[];
  campaignbonus?: CampaignBonus[];
}

export interface TopAddFriendPointSvt {
  userSvtId: number;
  svtId: number;
}

export interface SeqLoginBonus {
  message: string;
  items: SeqLoginBonusItem[];
}

export interface SeqLoginBonusItem {
  name: string;
  num: number;
}

export interface CampaignBonus {
  name: string;
  detail: string;
  items: CampaignBonusItem[];
}

export interface CampaignBonusItem {
  name: string;
  num: number;
}