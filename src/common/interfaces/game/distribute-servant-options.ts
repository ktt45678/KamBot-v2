import { FGOServant } from '../../../models/game';

export interface DistributeServantOptions {
  servantList: FGOServant[];
  rateUpServantList?: FGOServant[];
  addToSummonData: (servant: FGOServant, dropRate: number) => void;
  addToGSRSummonData: (servant: FGOServant, dropRate: number) => void;
}