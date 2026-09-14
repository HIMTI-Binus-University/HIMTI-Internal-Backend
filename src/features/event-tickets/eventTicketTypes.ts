import {
   createCipheriv,
   createDecipheriv,
   createHash,
   randomBytes,
} from 'node:crypto';
import { AppError } from '@/utils/appError.js';

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const keyForVersion = (
   version = process.env.TICKET_CREDENTIAL_KEY_VERSION ?? 'v1',
) => {
   const configured =
      process.env[`TICKET_CREDENTIAL_KEY_${version.toUpperCase()}`];
   const fallback = process.env.BETTER_AUTH_SECRET;
   const raw = configured ? Buffer.from(configured, 'base64') : null;
   if (raw?.length === 32) return { version, key: raw };
   if (version === 'local' && process.env.NODE_ENV !== 'production' && fallback)
      return {
         version: 'local',
         key: createHash('sha256')
            .update('himti-ticket-credential\0')
            .update(fallback)
            .digest(),
      };
   if (
      version === (process.env.TICKET_CREDENTIAL_KEY_VERSION ?? 'v1') &&
      process.env.NODE_ENV !== 'production' &&
      fallback
   )
      return {
         version: 'local',
         key: createHash('sha256')
            .update('himti-ticket-credential\0')
            .update(fallback)
            .digest(),
      };
   throw new AppError(
      'Ticket credentials are not configured',
      503,
      'TICKET_CREDENTIAL_UNAVAILABLE',
   );
};

export const normalizeTicketCredential = (value: string) =>
   value.replace(/[^A-Z0-9]/gi, '').toUpperCase();

export const generateTicketCredential = () => {
   const bytes = randomBytes(17);
   let bits = 0;
   let value = 0;
   let result = '';
   for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
         result += alphabet[(value >>> (bits - 5)) & 31];
         bits -= 5;
      }
   }
   return result
      .slice(0, 26)
      .match(/.{1,5}/g)!
      .join('-');
};

export const hashTicketCredential = (value: string) =>
   createHash('sha256').update(normalizeTicketCredential(value)).digest('hex');

export const encryptTicketCredential = (credential: string) => {
   const { version, key } = keyForVersion();
   const iv = randomBytes(12);
   const cipher = createCipheriv('aes-256-gcm', key, iv);
   const encrypted = Buffer.concat([
      cipher.update(credential, 'utf8'),
      cipher.final(),
   ]);
   return [version, iv, cipher.getAuthTag(), encrypted]
      .map((part) =>
         typeof part === 'string' ? part : part.toString('base64url'),
      )
      .join('.');
};

export const decryptTicketCredential = (stored: string) => {
   try {
      const [version, ivValue, tagValue, encryptedValue, extra] =
         stored.split('.');
      const storedKey = version ? keyForVersion(version) : null;
      if (!storedKey || !ivValue || !tagValue || !encryptedValue || extra)
         throw new Error();
      const decipher = createDecipheriv(
         'aes-256-gcm',
         storedKey.key,
         Buffer.from(ivValue, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      return Buffer.concat([
         decipher.update(Buffer.from(encryptedValue, 'base64url')),
         decipher.final(),
      ]).toString('utf8');
   } catch {
      throw new AppError(
         'Ticket credential is unavailable',
         503,
         'TICKET_CREDENTIAL_UNAVAILABLE',
      );
   }
};

export const createTicketCredential = () => {
   const credential = generateTicketCredential();
   return {
      credential,
      tokenHash: hashTicketCredential(credential),
      credentialEncrypted: encryptTicketCredential(credential),
   };
};

export const createStoredTicketCredential = () => {
   const generated = createTicketCredential();
   return {
      tokenHash: generated.tokenHash,
      credentialEncrypted: generated.credentialEncrypted,
   };
};
