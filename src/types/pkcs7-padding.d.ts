declare module 'pkcs7-padding' {
  function pad(data: Buffer, size?: number): Buffer;
  function pad(data: string, size?: number): string;
  function unpad(data: Buffer, size?: number): Buffer;
  function unpad(data: string, size?: number): string;
  function unpad(data: Uint8Array, size?: number): Uint8Array;
}