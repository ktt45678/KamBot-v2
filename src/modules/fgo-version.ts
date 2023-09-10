import { container } from '@sapphire/framework';

import { CachePrefix } from '../common/enums';
import { http } from './axios';

export class FGOVersion {
  getPlayStoreVer(region: 'na' | 'jp') {
    // TODO: Finish this
    return container.memoryCache.wrap<string | null>(`${CachePrefix.FGOPlayStoreVer}:${region}`, async () => {
      // const playStoreUrls = {
      //   na: 'https://play.google.com/store/apps/details?id=com.aniplex.fategrandorder.en',
      //   jp: 'https://play.google.com/store/apps/details?id=com.aniplex.fategrandorder'
      // };
      return null;
    }, 300_000);
  }

  getAppStoreVer(region: 'na' | 'jp') {
    return container.memoryCache.wrap<string | null>(`${CachePrefix.FGOAppStoreVer}:${region}`, async () => {
      const appStoreUrls = {
        na: 'http://itunes.apple.com/us/lookup?bundleId=com.aniplex.fategrandorder.en',
        jp: 'http://itunes.apple.com/jp/lookup?bundleId=com.aniplex.fategrandorder'
      };
      const versionRegex = /^\d+\.\d+\.\d+$/;
      const result = await http.get(appStoreUrls[region], { params: { t: Date.now() } });
      const version: string = result.data['results'][0]['version'];
      if (versionRegex.test(version))
        return version;
      return null;
    }, 300_000);
  }

  async getVersion(region: 'na' | 'jp') {
    /*
    const playStoreVersion = await this.getPlayStoreVer(region);
    if (playStoreVersion)
      return playStoreVersion;
    */
    const appStoreVersion = await this.getAppStoreVer(region);
    if (appStoreVersion)
      return appStoreVersion;
    return null;
  }
}

export const fgoVersion = new FGOVersion();