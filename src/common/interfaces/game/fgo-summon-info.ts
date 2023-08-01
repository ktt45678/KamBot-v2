import { FGOSummonData } from './fgo-summon-data';

export interface FGOSummonInfo {
  totalDropRate: number;
  totalGSRDropRate: number;
  summonList: FGOSummonData[];
  gsrSummonList: FGOSummonData[];
}