import {
   acceptedProofTypes,
   HARD_MAX_PROOF_BYTES,
   paymentBankSnapshotSchema,
} from './eventPaymentSchema.js';

const supportedProofTypes = new Set<string>(acceptedProofTypes);

export const normalizePaymentBankSnapshot = (snapshot: unknown) => {
   const value =
      snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
         ? (snapshot as Record<string, unknown>)
         : {};
   const configuredTypes = Array.isArray(value.acceptedProofTypes)
      ? value.acceptedProofTypes.filter(
           (type): type is (typeof acceptedProofTypes)[number] =>
              typeof type === 'string' && supportedProofTypes.has(type),
        )
      : [];
   const configuredMax = value.maxProofBytes;

   return paymentBankSnapshotSchema.parse({
      bankName: typeof value.bankName === 'string' ? value.bankName : '',
      accountHolder:
         typeof value.accountHolder === 'string' ? value.accountHolder : '',
      accountNumber:
         typeof value.accountNumber === 'string' ? value.accountNumber : '',
      instructions:
         typeof value.instructions === 'string' ? value.instructions : null,
      acceptedProofTypes:
         configuredTypes.length > 0
            ? [...new Set(configuredTypes)]
            : [...acceptedProofTypes],
      maxProofBytes:
         typeof configuredMax === 'number' &&
         Number.isInteger(configuredMax) &&
         configuredMax > 0
            ? Math.min(configuredMax, HARD_MAX_PROOF_BYTES)
            : HARD_MAX_PROOF_BYTES,
   });
};
