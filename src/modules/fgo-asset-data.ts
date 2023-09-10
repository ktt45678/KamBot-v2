import { container } from '@sapphire/framework';
import cryptian, { padding } from 'cryptian';
import zlib from 'node:zlib';
import msgpack from 'msgpack-lite';
import CRC32 from 'crc-32';

import { CachePrefix } from '../common/enums';
import { FGOAssetAPIResponse } from '../common/interfaces/game';
import { http } from './axios';
import { fgoVersion } from './fgo-version';

export class FGOAssetData {
  region: 'na' | 'jp' = 'na';
  serverAddress: string = 'https://game.fate-go.us';
  appVer = '';
  dataVer = 0;
  dateVer = 0;
  verCode = '';
  assetBundleFolder = '';
  dataServerFolderCRC = 0;
  userAgent = 'Dalvik/2.1.0 (Linux; U; Android 11; Pixel 5 Build/RD1A.201105.003.A1)';
  httpHeaders = {
    'Accept-Encoding': 'gzip, identity',
    'User-Agent': this.userAgent,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Connection': 'Keep-Alive, TE',
    'TE': 'identity'
  }

  setRegion(region: 'na' | 'jp') {
    this.region = region;
    this.serverAddress = region === 'na' ? 'https://game.fate-go.us' : 'https://game.fate-go.jp';
    return this;
  }

  async setLatestAssets() {
    // Get Latest Version of the data!
    const versionStr = await fgoVersion.getVersion(this.region);
    if (!versionStr)
      return;
    const gamedata = await this.findLatestGamedata(versionStr);
    // Set AppVer, DataVer, DateVer
    this.appVer = versionStr;
    this.dataVer = gamedata.dataVer;
    this.dateVer = gamedata.dateVer;
    this.verCode = await this.getLatestVerCode();
    this.assetBundleFolder = gamedata.assetBundleFolder;
    this.dataServerFolderCRC = CRC32.str(gamedata.assetBundleFolder);
  }

  async postRequest<T extends FGOAssetAPIResponse>(path: string, data: any, params?: any) {
    const res = await http.post<T>(`${this.serverAddress}/${path}`, data, { headers: this.httpHeaders, params: params });
    const resCode = res.data.response[0].resCode;
    if (resCode != '00') {
      const detail = res.data.response[0].fail.detail;
      const message = `[ErrorCode: ${resCode}]\n${detail}`;
      throw Error(message);
    }
    return res.data;
  }

  private findLatestGamedata(version: string) {
    return container.memoryCache.wrap(`${CachePrefix.FGOLatestGameData}:${this.region}:${version}`, async () => {
      const gamedataResponse = await http.get(this.serverAddress + '/gamedata/top', {
        params: { appVer: version },
        headers: {
          'User-Agent': this.userAgent
        }
      });
      const gamedata = gamedataResponse.data['response'][0]['success'];
      const assetbundle = await this.getAssetBundle(gamedata['assetbundle']);
      return {
        dataVer: gamedata['dataVer'],
        dateVer: gamedata['dateVer'],
        assetBundleFolder: assetbundle['folderName']
      };
    }, 86_400_000);
  }

  private getLatestVerCode() {
    return container.memoryCache.wrap<string>(`${CachePrefix.FGOLatestVerCode}:${this.region}`, async () => {
      // Ref https://github.com/O-Isaac/FGO-Daily-Login/blob/master/main.py
      const endpoint = this.region === 'na' ?
        'https://raw.githubusercontent.com/O-Isaac/FGO-VerCode-extractor/NA/VerCode.json' :
        'https://raw.githubusercontent.com/O-Isaac/FGO-VerCode-extractor/JP/VerCode.json';
      const result = await http.get<{ appVer: string, verCode: string }>(endpoint);
      return result.data.verCode;
    }, 300_000);
  }

  private async getAssetBundle(assetbundle: string) {
    const assetbundleData = Buffer.from(assetbundle, 'base64');
    const keyStr = this.region === 'na' ? 'nn33CYId2J1ggv0bYDMbYuZ60m4GZt5P' : 'W0Juh4cFJSYPkebJB9WpswNF51oa6Gm7';
    const key = Buffer.from(keyStr, 'binary');
    const iv = assetbundleData.subarray(0, 32);
    const array = assetbundleData.subarray(32);
    const des = new cryptian.algorithm.Rijndael256();
    des.setKey(key);
    const decipher = new cryptian.mode.cbc.Decipher(des, iv);
    const decryptedPadded = decipher.transform(array);
    const padder = new padding.Pkcs7(32);
    const decryptedData = padder.unpad(decryptedPadded);
    // console.log('Asset bundle data', assetbundleData);
    // console.log('IV', iv);
    // console.log('Encrypted', array);
    // console.log(decryptedData.toString('hex'));
    const decompressedData = await this.decompressGzip(decryptedData);
    const unpackedData = msgpack.decode(decompressedData);
    return unpackedData;
  }

  private decompressGzip(compressedData: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      zlib.gunzip(compressedData, (error, buffer) => {
        if (error !== null)
          reject(error);
        resolve(buffer);
      });
    });
  }
}