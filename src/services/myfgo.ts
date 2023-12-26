import { container } from '@sapphire/framework';
import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';

import { FGOTopLoginResponse, MyFGOLoginResult } from '../common/interfaces/game';
import { aes256Decrypt, aes256Encrypt, sha1Hashsum, tripleDESDecrypt } from '../common/utils';
import { FGOAssetData } from '../modules';
import { MyFGOAccount, myFGOAccountModel } from '../models';
import { CachePrefix } from '../common/enums';
import { MYFGO_CRYPTO_SECRET_KEY } from '../config';
import { AxiosError } from 'axios';

export class MyFGOService {

  constructor() {
    this.initCronJobs();
  }

  decryptCertificate(certificate: string) {
    const decryptedCert = tripleDESDecrypt(certificate, 'b5nHjsMrqaeNliSs3jyOzgpD', 'wuD6keVr');
    return decryptedCert;
  }

  getUserGameRegion(serverUrl: string) {
    switch (serverUrl) {
      case 'game.fate-go.jp/':
        return 'jp';
      case 'game.fate-go.us/':
        return 'na';
      default:
        return null;
    }
  }

  generateAccountCryptoKey(password: string | null = null) {
    if (!password) return null;
    const shaKey = crypto.createHash('sha256').update(password).digest('base64').substring(0, 32);
    return shaKey;
  }

  encryptUserKey(key: string, secretKeys: (string | null)[]) {
    let encrypted = key;
    for (let i = 0; i < secretKeys.length; i++) {
      const secretKey = secretKeys[i];
      if (!secretKey) continue;
      const iv = crypto.randomBytes(16);
      encrypted = aes256Encrypt(encrypted, secretKey, iv) + '.' + iv.toString('base64');
    }
    return encrypted;
  }

  decryptUserKey(key: string, secretKeys: (string | null)[]) {
    let decrypted = key;
    for (let i = 0; i < secretKeys.length; i++) {
      const secretKey = secretKeys[i];
      if (!secretKey) continue;
      const [encrypted, ivBase64] = decrypted.split('.');
      if (!encrypted || !ivBase64)
        return null;
      decrypted = aes256Decrypt(encrypted, secretKey, Buffer.from(ivBase64, 'base64'));
    }
    return decrypted;
  }

  async topLogin(account: MyFGOAccount) {
    const region = <'na' | 'jp'>account.region;
    const fgoAssetData = new FGOAssetData();
    await fgoAssetData.setRegion(region).setLatestAssets();
    const loginData = this.createBaseRequestData(fgoAssetData, account);
    const lastAccessTime = loginData.get('lastAccessTime') || Math.round(Date.now() / 1000).toString();
    const userState = (-Number(lastAccessTime) >> 2) ^ Number(account.accUserId) & fgoAssetData.dataServerFolderCRC;
    // Login params
    loginData.append('assetbundleFolder', fgoAssetData.assetBundleFolder);
    loginData.append('isTerminalLogin', '1');
    loginData.append('userState', userState.toString());
    // SHA1 auth code
    const authCode = this.generateAuthCode(loginData, account.secretKey);
    loginData.append('authCode', authCode);
    const loginResult = await fgoAssetData.postRequest<FGOTopLoginResponse>('login/top', loginData.toString(), {
      _userId: account.accUserId
    });
    // Map result
    const userGame = loginResult.cache.replaced.userGame[0];
    const userLogin = loginResult.cache.updated.userLogin[0];
    const tblUserGame = loginResult.cache.replaced.tblUserGame[0];
    const successData = loginResult.response[0].success;
    const myFgoResult: MyFGOLoginResult = {
      name: userGame.name,
      saintQuartz: userGame.stone,
      freeSaintQuartz: userGame.freeStone,
      paidSaintQuartz: userGame.chargeStone,
      level: userGame.lv,
      ticket: loginResult.cache.replaced.userItem.find(i => i.itemId === 4001)?.num || 0,
      loginDays: userLogin.seqLoginCount,
      totalDays: userLogin.totalLoginCount,
      apMax: userGame.actMax,
      apRecoverAt: userGame.actRecoverAt,
      currentAp: 0,
      receivedFriendPoint: successData.addFriendPoint || 0,
      totalFriendPoint: tblUserGame.friendPoint
    };
    myFgoResult.currentAp = Math.round(myFgoResult.apMax - (myFgoResult.apRecoverAt - Math.round(Date.now() / 1000)) / 300);
    // Daily login bonus
    if (successData.seqLoginBonus) {
      const seqLoginBonus = successData.seqLoginBonus[0];
      const bonusMessage = seqLoginBonus.message;
      const bonusItems: string[] = [];
      const itemsCampBonus: string[] = [];
      seqLoginBonus.items.forEach(i => {
        bonusItems.push(`${i.name} x${i.num}`);
      });
      myFgoResult.bonusMessage = bonusMessage;
      myFgoResult.bonusItems = bonusItems;
      if (successData.campaignbonus) {
        const campaignbonus = successData.campaignbonus[0];
        campaignbonus.items.forEach(i => {
          itemsCampBonus.push(`${i.name} x${i.num}`);
        });
        myFgoResult.bonusName = campaignbonus.name;
        myFgoResult.bonusDetail = campaignbonus.detail;
        myFgoResult.campBonusItems = itemsCampBonus;
      }
    }
    return myFgoResult;
  }

  // async profileData(account: MyFGOAccount) {
  //   const region = <'na' | 'jp'>account.region;
  //   const fgoAssetData = new FGOAssetData();
  //   await fgoAssetData.setRegion(region).setLatestAssets();
  //   const loginData = this.createBaseRequestData(fgoAssetData, account);
  //   const lastAccessTime = loginData.get('lastAccessTime') || Math.round(Date.now() / 1000).toString();
  //   const userState = (-Number(lastAccessTime) >> 2) ^ Number(account.accUserId) & fgoAssetData.dataServerFolderCRC;
  //   // Login params
  //   loginData.append('friendCode', '405,649,077');
  //   loginData.append('assetbundleFolder', fgoAssetData.assetBundleFolder);
  //   loginData.append('isTerminalLogin', '0');
  //   loginData.append('userState', userState.toString());
  //   // SHA1 auth code
  //   const authCode = this.generateAuthCode(loginData, account.secretKey);
  //   loginData.append('authCode', authCode);
  //   const profileResult = await fgoAssetData.postRequest<FGOTopLoginResponse>('profile/top', loginData.toString(), {
  //     _userId: account.accUserId,
  //     friendCode: '405,649,077'
  //   });
  //   // Map result
  //   console.log(profileResult);
  // }

  private initCronJobs() {
    const job = new CronJob('* * * * *', () => {
      this.runScheduledLogin();
    });

    job.start();
  }

  private async runScheduledLogin() {
    const accounts = await myFGOAccountModel.find({ 'settings.autoLogin': true }).exec();
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const plainAccount = account.toObject();
      try {
        if (account.settings.autoLoginExpiry && account.settings.autoLoginExpiry <= new Date()) {
          container.logger.info(`Login schedule has expired for account ${account.displayName} (id ${account._id}), deactivating...`);
          account.settings.autoLogin = false;
          account.settings.autoLoginInterval = null;
          account.settings.autoLoginExpiry = null;
          await account.save();
          continue;
        }
        const autoLoginInterval = account.settings.autoLoginInterval || 300;
        if (account.lastLogin && ((Date.now() - account.lastLogin.getTime()) / 1000) < autoLoginInterval)
          continue;
        container.logger.info(`Running scheduled login for account ${account.displayName} (id ${account._id})`);
        const decryptedKeysCacheKey = `${CachePrefix.MyFGOAccountDecryptedKeys}:${account._id}`;
        let decryptedAuthKey: string | null = null;
        let decryptedSecretKey: string | null = null;
        const decryptedKeys = await container.redisCache.get<{ authKey: string, secretKey: string }>(decryptedKeysCacheKey);
        if (decryptedKeys) {
          plainAccount.authKey = decryptedKeys.authKey;
          plainAccount.secretKey = decryptedKeys.secretKey;
          await container.redisCache.set(decryptedKeysCacheKey, decryptedKeys, 604_800);
        } else {
          if (account.cryptType === 2) {
            // Cannot decrypt without user password
            container.logger.warn(`Unable to decrypt account ${account.displayName} (User password is required)`);
            continue;
          }
          const cryptKey = this.generateAccountCryptoKey(MYFGO_CRYPTO_SECRET_KEY);
          decryptedAuthKey = this.decryptUserKey(account.authKey, [cryptKey]);
          decryptedSecretKey = this.decryptUserKey(account.secretKey, [cryptKey]);
          if (!decryptedAuthKey || !decryptedSecretKey)
            continue;
          plainAccount.authKey = decryptedAuthKey;
          plainAccount.secretKey = decryptedSecretKey;
          await container.redisCache.set(decryptedKeysCacheKey, { authKey: decryptedAuthKey, secretKey: decryptedSecretKey }, 604_800);
        }
        await this.topLogin(plainAccount);
        container.logger.debug('Successfully logged in');
        account.lastLogin = new Date();
        await account.save();
      } catch (error) {
        container.logger.error(`Scheduled login failed for account ${plainAccount.displayName}`);
        if (error instanceof AxiosError) {
          container.logger.error(`${error.response?.status || '0'}: ${JSON.stringify(error.response?.data) || 'Unknwon http error'}`);
        } else {
          container.logger.error(JSON.stringify(error));
        }
      }
    }
  }

  private createBaseRequestData(fgoAssetData: FGOAssetData, account: MyFGOAccount) {
    const requestData = new URLSearchParams();
    requestData.append('appVer', fgoAssetData.appVer);
    requestData.append('dataVer', fgoAssetData.dataVer.toString());
    requestData.append('dateVer', fgoAssetData.dateVer.toString());
    requestData.append('verCode', fgoAssetData.verCode);
    requestData.append('idempotencyKey', uuidv4());
    requestData.append('lastAccessTime', Math.round(Date.now() / 1000).toString());
    requestData.append('authKey', account.authKey);
    requestData.append('userId', account.accUserId);
    return requestData;
  }

  private generateAuthCode(requestData: URLSearchParams, secretKey: string) {
    requestData.sort(); // Sorting is needed for generating sha1 hash
    const authCode = decodeURIComponent(requestData.toString()) + ':' + secretKey;
    const authCodeHash = sha1Hashsum(authCode);
    return authCodeHash;
  }
}

export const myFGOService = new MyFGOService();