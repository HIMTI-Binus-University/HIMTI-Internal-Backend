import {
   createCipheriv,
   createDecipheriv,
   createHash,
   randomBytes,
} from 'node:crypto';
import { AppError } from '@/utils/appError.js';

const versionPattern = /^[a-z0-9_-]{1,20}$/i;
const base64Pattern =
   /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const decode = (value: string, bytes: number) => {
   if (!base64Pattern.test(value)) return null;
   const result = Buffer.from(value, 'base64');
   return result.length === bytes && result.toString('base64') === value
      ? result
      : null;
};
const activeVersion = () => {
   const value = process.env.TICKET_CREDENTIAL_KEY_VERSION ?? 'v1';
   if (!versionPattern.test(value))
      throw new AppError('Ticket credential service is unavailable', 503);
   return value;
};
const key = (version: string) => {
   if (!versionPattern.test(version))
      throw new AppError('Ticket credential service is unavailable', 503);
   const encoded =
      process.env[`TICKET_CREDENTIAL_KEY_${version.toUpperCase()}`];
   const configured = encoded ? decode(encoded, 32) : null;
   if (configured) return configured;
   if (encoded || process.env.NODE_ENV === 'production')
      throw new AppError('Ticket credential service is unavailable', 503);
   return createHash('sha256')
      .update(
         `ticket-dev-only:${process.env.BETTER_AUTH_SECRET || 'local-only'}`,
      )
      .digest();
};
const aad = (id: string, memberId: string, version: string) =>
   Buffer.from(`himti-ticket|${id}|${memberId}|${version}`);

export const createOpaqueTicketCredential = () =>
   `ht1_${randomBytes(32).toString('base64url')}`;
export const hashTicketCredential = (value: string) =>
   createHash('sha256').update(value).digest('hex');
export const encryptTicketCredential = (
   value: string,
   id: string,
   memberId: string,
) => {
   const keyVersion = activeVersion();
   const tokenIv = randomBytes(12);
   const cipher = createCipheriv('aes-256-gcm', key(keyVersion), tokenIv);
   cipher.setAAD(aad(id, memberId, keyVersion));
   const tokenCiphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
   ]);
   return {
      tokenCiphertext: tokenCiphertext.toString('base64'),
      tokenIv: tokenIv.toString('base64'),
      tokenAuthTag: cipher.getAuthTag().toString('base64'),
      keyVersion,
   };
};
export const decryptTicketCredential = (ticket: {
   id: string;
   orderMemberId: string;
   tokenCiphertext: string | null;
   tokenIv: string | null;
   tokenAuthTag: string | null;
   keyVersion: string | null;
}) => {
   if (
      !ticket.tokenCiphertext ||
      !ticket.tokenIv ||
      !ticket.tokenAuthTag ||
      !ticket.keyVersion
   )
      return null;
   const iv = decode(ticket.tokenIv, 12);
   const tag = decode(ticket.tokenAuthTag, 16);
   if (!iv || !tag || !base64Pattern.test(ticket.tokenCiphertext)) return null;
   try {
      const decipher = createDecipheriv(
         'aes-256-gcm',
         key(ticket.keyVersion),
         iv,
      );
      decipher.setAAD(aad(ticket.id, ticket.orderMemberId, ticket.keyVersion));
      decipher.setAuthTag(tag);
      const value = Buffer.concat([
         decipher.update(Buffer.from(ticket.tokenCiphertext, 'base64')),
         decipher.final(),
      ]).toString('utf8');
      return value.startsWith('ht1_') ? value : null;
   } catch (error) {
      if (error instanceof AppError) throw error;
      return null;
   }
};
