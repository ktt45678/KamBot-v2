import { container } from '@sapphire/framework';
import { FlattenMaps } from 'mongoose';
import sharp from 'sharp';

import { http } from '../modules';
import { FGOCraftEssence, FGOServant, fgoCraftEssenceModel, fgoServantModel, fgoSummonableCEModel, fgoSummonableServantModel } from '../models/game';
import { FGOConfig } from '../common/configs';
import { DistributeCEOptions, DistributeServantOptions, FGOSummonData, FGOSummonInfo } from '../common/interfaces/game';
import { CachePrefix } from '../common/enums';
import { IMAGEKIT_URL } from '../config';

export class FGOService {
  async buildSummonInfo(rateUpServants?: FGOServant[], rateUpCEs?: FGOCraftEssence[]) {
    let cacheKey = 'base';
    rateUpServants && (cacheKey += ':' + rateUpServants.reduce((acc, item) => acc + item._id, 0));
    rateUpCEs && (cacheKey += ':' + rateUpCEs.reduce((acc, item) => acc + item._id, 0));
    const cachedSummonInfo = await container.memoryCache.get<FGOSummonInfo>(`${CachePrefix.FGOSummonInfo}:${cacheKey}`);
    if (cachedSummonInfo) return cachedSummonInfo;
    const nonLimitedServants = await this.findNonLimitedServants();
    const nonLimitedCEs = await this.findNonLimitedCraftEssences();
    // Build summon list
    let totalDropRate = 0;
    let totalGSRDropRate = 0;
    const summonList: FGOSummonData[] = [];
    const gsrSummonList: FGOSummonData[] = [];
    this.distributeServantList({
      servantList: nonLimitedServants,
      rateUpServantList: rateUpServants,
      addToSummonData: (servant, dropRate) => {
        summonList.push({ id: servant._id, type: 'servant', dropRate: dropRate });
        totalDropRate += dropRate;
      },
      addToGSRSummonData: (servant, dropRate) => {
        gsrSummonList.push({ id: servant._id, type: 'servant', dropRate: dropRate });
        totalGSRDropRate += dropRate;
      }
    });
    this.distributeCEList({
      ceList: nonLimitedCEs,
      rateUpCEList: rateUpCEs,
      addToSummonData: (ce, dropRate) => {
        summonList.push({ id: ce._id, type: 'ce', dropRate: dropRate });
        totalDropRate += dropRate;
      },
      addToGSRSummonData: (ce, dropRate) => {
        gsrSummonList.push({ id: ce._id, type: 'ce', dropRate: dropRate });
        totalGSRDropRate += dropRate;
      }
    });
    const summonInfo: FGOSummonInfo = { totalDropRate, summonList, totalGSRDropRate, gsrSummonList };
    await container.memoryCache.set(`${CachePrefix.FGOSummonInfo}:${cacheKey}`, summonInfo, 3_600_000);
    return summonInfo;
  }

  distributeServantList(options: DistributeServantOptions) {
    const { servantList, rateUpServantList, addToSummonData, addToGSRSummonData } = options;
    const [s5Servants, s4Servants, s3Servants] = this.distributeList<FGOServant>(servantList);
    let s5RateUpServants: FGOServant[] = [], s4RateUpServants: FGOServant[] = [], s3RateUpServants: FGOServant[] = [];
    if (rateUpServantList)
      [s5RateUpServants, s4RateUpServants, s3RateUpServants] = this.distributeList<FGOServant>(rateUpServantList);
    const s5RateUpPercent = s5RateUpServants.length ? FGOConfig.RateUpPercent.Servant.S5 : 0;
    const s4RateUpPercent = s4RateUpServants.length ? FGOConfig.RateUpPercent.Servant.S4 : 0;
    const s3RateUpPercent = s3RateUpServants.length ? FGOConfig.RateUpPercent.Servant.S3 : 0;
    const s5RateUpServantDropRate = Math.trunc(FGOConfig.RateUpPercent.Servant.S5 / s5RateUpServants.length * 1000) / 1000;
    const s4RateUpServantDropRate = Math.trunc(FGOConfig.RateUpPercent.Servant.S5 / s4RateUpServants.length * 1000) / 1000;
    const s3RateUpServantDropRate = Math.trunc(FGOConfig.RateUpPercent.Servant.S5 / s3RateUpServants.length * 1000) / 1000;
    const s5ServantDropRate = Math.trunc((FGOConfig.Rate.Servant.S5 - s5RateUpPercent) / s5Servants.length * 1000) / 1000;
    const s4ServantDropRate = Math.trunc((FGOConfig.Rate.Servant.S4 - s4RateUpPercent) / s4Servants.length * 1000) / 1000;
    const s3ServantDropRate = Math.trunc((FGOConfig.Rate.Servant.S3 - s3RateUpPercent) / s3Servants.length * 1000) / 1000;
    s5Servants.forEach(servant => {
      addToSummonData(servant, s5ServantDropRate);
      addToGSRSummonData(servant, s5ServantDropRate);
    });
    s4Servants.forEach(servant => {
      addToSummonData(servant, s4ServantDropRate);
      addToGSRSummonData(servant, s4ServantDropRate);
    });
    s3Servants.forEach(servant => {
      addToSummonData(servant, s3ServantDropRate);
    });
    s5RateUpServants.forEach(servant => {
      addToSummonData(servant, s5RateUpServantDropRate);
      addToGSRSummonData(servant, s5RateUpServantDropRate);
    });
    s4RateUpServants.forEach(servant => {
      addToSummonData(servant, s4RateUpServantDropRate);
      addToGSRSummonData(servant, s4RateUpServantDropRate);
    });
    s3RateUpServants.forEach(servant => {
      addToSummonData(servant, s3RateUpServantDropRate);
    });
  }

  distributeCEList(options: DistributeCEOptions) {
    const { ceList, rateUpCEList, addToSummonData, addToGSRSummonData } = options;
    const [s5CEs, s4CEs, s3CEs] = this.distributeList<FGOCraftEssence>(ceList);
    let s5RateUpCEs: FGOCraftEssence[] = [], s4RateUpCEs: FGOCraftEssence[] = [], s3RateUpCEs: FGOCraftEssence[] = [];
    if (rateUpCEList)
      [s5RateUpCEs, s4RateUpCEs, s3RateUpCEs] = this.distributeList<FGOCraftEssence>(rateUpCEList);
    const s5RateUpPercent = s5RateUpCEs.length ? FGOConfig.RateUpPercent.CE.S5 : 0;
    const s4RateUpPercent = s4RateUpCEs.length ? FGOConfig.RateUpPercent.CE.S4 : 0;
    const s3RateUpPercent = s3RateUpCEs.length ? FGOConfig.RateUpPercent.CE.S3 : 0;
    const s5RateUpCEDropRate = Math.trunc(FGOConfig.RateUpPercent.CE.S5 / s5RateUpCEs.length * 1000) / 1000;
    const s4RateUpCEDropRate = Math.trunc(FGOConfig.RateUpPercent.CE.S5 / s4RateUpCEs.length * 1000) / 1000;
    const s3RateUpCEDropRate = Math.trunc(FGOConfig.RateUpPercent.CE.S5 / s3RateUpCEs.length * 1000) / 1000;
    const s5CEDropRate = Math.trunc((FGOConfig.Rate.CE.S5 - s5RateUpPercent) / s5CEs.length * 1000) / 1000;
    const s4CEDropRate = Math.trunc((FGOConfig.Rate.CE.S4 - s4RateUpPercent) / s4CEs.length * 1000) / 1000;
    const s3CEDropRate = Math.trunc((FGOConfig.Rate.CE.S3 - s3RateUpPercent) / s3CEs.length * 1000) / 1000;
    s5CEs.forEach(ce => {
      addToSummonData(ce, s5CEDropRate);
      addToGSRSummonData(ce, s5CEDropRate);
    });
    s4CEs.forEach(ce => {
      addToSummonData(ce, s4CEDropRate);
      addToGSRSummonData(ce, s5CEDropRate);
    });
    s3CEs.forEach(ce => {
      addToSummonData(ce, s3CEDropRate);
    });
    s5RateUpCEs.forEach(ce => {
      addToSummonData(ce, s5RateUpCEDropRate);
      addToGSRSummonData(ce, s5RateUpCEDropRate);
    });
    s4RateUpCEs.forEach(ce => {
      addToSummonData(ce, s4RateUpCEDropRate);
      addToGSRSummonData(ce, s4RateUpCEDropRate);
    });
    s3RateUpCEs.forEach(ce => {
      addToSummonData(ce, s3RateUpCEDropRate);
    });
  }

  distributeList<T extends FGOServant | FGOCraftEssence>(itemList: T[]) {
    const s5List: T[] = [];
    const s4List: T[] = [];
    const s3List: T[] = [];
    for (let i = 0; i < itemList.length; i++) {
      if (itemList[i].rarity === 5)
        s5List.push(itemList[i]);
      else if (itemList[i].rarity === 4)
        s4List.push(itemList[i]);
      else
        s3List.push(itemList[i]);
    }
    return [s5List, s4List, s3List];
  }

  createSummonData(totalDropRate: number, summonList: FGOSummonData[]) {
    const randomNumber = Math.random() * totalDropRate;
    let accumulatedRarity = 0;
    let summonedData: FGOSummonData | null = null;

    for (let i = 0; i < summonList.length; i++) {
      accumulatedRarity += summonList[i].dropRate;
      if (randomNumber <= accumulatedRarity) {
        summonedData = summonList[i];
        break;
      }
    }
    return summonedData!;
  }

  async singleSummon(summonInfo: FGOSummonInfo) {
    const summonedData = this.createSummonData(summonInfo.totalDropRate, summonInfo.summonList);
    const result: FGOCraftEssence | FGOServant | null = summonedData.type === 'ce' ?
      await fgoCraftEssenceModel.findOne({ _id: summonedData.id }).lean().exec() :
      await fgoServantModel.findOne({ _id: summonedData.id }).lean().exec();
    return result;
  }

  async multiSummon(summonInfo: FGOSummonInfo) {
    const summonedResultPromises: Promise<FGOServant | FGOCraftEssence | null>[] = [];
    const gsrPosition = Math.floor(Math.random() * 12);
    for (let i = 0; i < 11; i++) {
      let summonedData: FGOSummonData;
      if (gsrPosition !== i)
        summonedData = this.createSummonData(summonInfo.totalDropRate, summonInfo.summonList);
      else
        summonedData = this.createSummonData(summonInfo.totalGSRDropRate, summonInfo.gsrSummonList);
      const summonResultPromise = summonedData.type === 'ce' ?
        fgoCraftEssenceModel.findOne({ _id: summonedData.id }).lean().exec() :
        fgoServantModel.findOne({ _id: summonedData.id }).lean().exec();
      summonedResultPromises.push(summonResultPromise);
    }
    return Promise.all(summonedResultPromises);
  }

  async createImage(summonedData: FGOCraftEssence | FGOServant | null) {
    const cacheKey = `${CachePrefix.SummonResultImage}:${summonedData?._id || -1}`;
    const cachedResult = await container.mongoDbCache.get<Buffer>(cacheKey);
    if (cachedResult) return cachedResult;
    const originalWidth = FGOConfig.ImageOptions.OriginalWidth;
    const originalHeight = FGOConfig.ImageOptions.OriginalHeight;
    const imageData = sharp({
      create: {
        width: originalWidth,
        height: originalHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    if (!summonedData) {
      return imageData
        .resize({ width: FGOConfig.ImageOptions.ScaledWidth, height: FGOConfig.ImageOptions.ScaledHeight })
        .png().toBuffer();
    }
    const { frameUrl, frameTextUrl, frameRarityUrl, frameClassUrl } = this.resolveFrameUrls(summonedData);
    const frameShadowUrl = `${IMAGEKIT_URL}/${FGOConfig.ImageSources.FrameShadow}`;
    const faceUrl = `${IMAGEKIT_URL}/${summonedData.facePath}`;
    let donwloadClassImagePromise = frameClassUrl ? this.downloadImageCache(frameClassUrl) : null;
    const [
      maskImageData,
      frameImageData,
      frameShadowImageData,
      textImageData,
      faceImageData,
      rarityImageData,
      classImageData
    ] = await Promise.all([
      this.downloadImageCache(`${IMAGEKIT_URL}/${FGOConfig.ImageSources.FaceMask}`),
      this.downloadImageCache(frameUrl),
      this.downloadImageCache(frameShadowUrl),
      this.downloadImageCache(frameTextUrl),
      this.downloadImage(faceUrl),
      this.downloadImageCache(frameRarityUrl),
      donwloadClassImagePromise
    ]);
    const rarityImageMetadata = await sharp(rarityImageData).metadata();
    const rarityImageLeft = originalWidth - (rarityImageMetadata.width || 0) - 12;
    const rarityImageTop = originalHeight - (rarityImageMetadata.height || 0) - 23;
    const scaledClassImageData = classImageData ? await sharp(classImageData)
      .resize({ width: 40, height: 40 })
      .png().toBuffer() : null;
    const scaledFaceImageData = await sharp(faceImageData)
      .resize({ width: 126, height: 126 })
      .composite([{ input: maskImageData, blend: 'dest-in' }])
      .png().toBuffer();
    const compositeOptions: sharp.OverlayOptions[] = [
      { input: frameImageData },
      { input: textImageData, left: 8, top: 135 },
      { input: scaledFaceImageData, left: 8, top: 9 },
      { input: rarityImageData, left: rarityImageLeft, top: rarityImageTop },
      { input: frameShadowImageData, left: 8, top: 9 }
    ];
    if (scaledClassImageData)
      compositeOptions.push({ input: scaledClassImageData, left: 5, top: 5 });
    const result = await imageData.composite(compositeOptions).png().toBuffer();
    const scaledResultData = await sharp(result)
      .resize({ width: FGOConfig.ImageOptions.ScaledWidth, height: FGOConfig.ImageOptions.ScaledHeight })
      .png().toBuffer();
    await container.mongoDbCache.set(cacheKey, scaledResultData, 86_400_000);
    return scaledResultData;
  }

  async createSummonResultImage(images: Buffer[]) {
    const frameWidth = FGOConfig.ImageOptions.ScaledWidth;
    const frameHeight = FGOConfig.ImageOptions.ScaledHeight;
    const gapSizeLeft = 23;
    const gapSizeTop = 66;
    const totalWidth = images.length > 6 ? frameWidth * 6 + gapSizeLeft * 5 : frameWidth * images.length + gapSizeLeft * (images.length - 1);
    const totalHeight = images.length > 6 ? frameHeight * 2 + gapSizeTop : frameHeight;
    const imageData = sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });
    let left = 0;
    let top = 0;
    const compositeOptions: sharp.OverlayOptions[] = [];
    for (let i = 0; i < images.length; i++) {
      compositeOptions.push({ input: images[i], top: top, left: left });
      left += 375;
      if (i === 5) {
        top = 450;
        left = 187;
      }
    }
    const [resultListImageData, bgImageData] = await Promise.all([
      imageData.composite(compositeOptions).png().toBuffer(),
      this.downloadImageCache(`${IMAGEKIT_URL}/${FGOConfig.ImageSources.SummonResultBG}`)
    ]);
    const bgImageResultData = await sharp(bgImageData).composite([{ input: resultListImageData }]).jpeg().toBuffer();
    return bgImageResultData;
  }

  resolveFrameUrls(summonedData: FGOCraftEssence | FGOServant) {
    let frameUrl: string = IMAGEKIT_URL + '/';
    let frameTextUrl: string = IMAGEKIT_URL + '/';
    let frameRarityUrl: string = IMAGEKIT_URL + '/';
    let frameClassUrl: string | null = IMAGEKIT_URL + '/';
    if (summonedData.rarity >= 4) {
      frameUrl += FGOConfig.ImageSources.GoldenFrame;
      if ('classId' in summonedData) {
        frameTextUrl += FGOConfig.ImageSources.GoldenServantText;
        frameClassUrl += `${FGOConfig.ClassIconPath}/class3_${summonedData.classId}.png`;
      } else {
        frameTextUrl += FGOConfig.ImageSources.GoldenCEText;
        frameClassUrl = null;
      }
    } else {
      frameUrl += FGOConfig.ImageSources.SilverFrame;
      if ('classId' in summonedData) {
        frameTextUrl += FGOConfig.ImageSources.SilverServantText;
        frameClassUrl += `${FGOConfig.ClassIconPath}/class2_${summonedData.classId}.png`;
      } else {
        frameTextUrl += FGOConfig.ImageSources.SilverCEText;
        frameClassUrl = null;
      }
    }
    frameRarityUrl += `${FGOConfig.CommonUIPath}/rarity${summonedData.rarity}_0.png`;
    return { frameUrl, frameTextUrl, frameRarityUrl, frameClassUrl };
  }

  async downloadImageCache(url: string) {
    return container.mongoDbCache.wrap(`${CachePrefix.DownloadedFile}:${url}`, () => {
      return this.downloadImage(url);
    }, 86_400_000);
  }

  async downloadImage(url: string) {
    const response = await http.get(url, { responseType: 'arraybuffer' });
    return response.data;
  }

  findOneServant(id: number) {
    return fgoServantModel.findOne({ _id: id }).lean().exec();
  }

  findOneCraftEssence(id: number) {
    return fgoCraftEssenceModel.findOne({ _id: id }).lean().exec();
  }

  findServants(ids: number[]) {
    return fgoServantModel.find({ _id: { $in: ids } }).limit(ids.length).lean().exec();
  }

  findCraftEssences(ids: number[]) {
    return fgoCraftEssenceModel.find({ _id: { $in: ids } }).limit(ids.length).lean().exec();
  }

  async findNonLimitedServants() {
    const summonableList = await fgoSummonableServantModel.find({ limited: false })
      .populate({ path: 'servant', select: { _id: 1, rarity: 1 } }).lean().exec();
    return summonableList.map(s => <FlattenMaps<FGOServant>>s.servant);
  }

  async findNonLimitedCraftEssences() {
    const summonableList = await fgoSummonableCEModel.find({ limited: false })
      .populate({ path: 'ce', select: { _id: 1, rarity: 1 } }).lean().exec();
    return summonableList.map(s => <FlattenMaps<FGOCraftEssence>>s.ce);
  }
}

export const fgoService = new FGOService();