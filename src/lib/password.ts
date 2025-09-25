import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(nodeScrypt);
const SALT_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 64;

export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password must not be empty');
  }

  const salt = randomBytes(SALT_LENGTH_BYTES).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH_BYTES)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) {
    return false;
  }

  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) {
    return false;
  }

  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH_BYTES)) as Buffer;

  if (keyBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(keyBuffer, derivedKey);
}
