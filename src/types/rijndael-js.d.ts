declare module 'rijndael-js' {
  declare class Rijndael {
    constructor(key: Buffer | string, mode: string);
    encrypt(_plaintext: Buffer | string, blockSize: number, _iv: Buffer | string): Uint8Array;
    decrypt(_ciphertext: Buffer, blockSize: number, _iv: Buffer | string): Uint8Array;
  }

  export = RijndaelBlock;
}