import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

export function tripleDESDecrypt(input: string, key: string, iv: crypto.BinaryLike) {
  const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
  const decrypted = decipher.update(input, 'base64', 'utf8') + decipher.final('utf8');
  return decrypted;
}

export function aes256Encrypt(text: string, key: string, iv: crypto.BinaryLike) {
  const cipher = crypto.createCipheriv('aes256', key, iv);
  const encrypted = cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
  return encrypted;
}

export function aes256Decrypt(text: string, key: string, iv: crypto.BinaryLike) {
  const decipher = crypto.createDecipheriv('aes256', key, iv);
  const decrypted = decipher.update(text, 'base64', 'utf8') + decipher.final('utf8');
  return decrypted;
}

export function sha1Hashsum(text: string, encoding: crypto.BinaryToTextEncoding = 'base64') {
  const shasum = crypto.createHash('sha1');
  shasum.update(text);
  const hash = shasum.digest(encoding);
  return hash;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}