import { FGOCraftEssence } from '../../../models/game';

export interface DistributeCEOptions {
  ceList: FGOCraftEssence[];
  rateUpCEList?: FGOCraftEssence[];
  addToSummonData: (ce: FGOCraftEssence, dropRate: number) => void;
  addToGSRSummonData: (ce: FGOCraftEssence, dropRate: number) => void;
}