export type PaymentActor = { id: string; roles?: unknown };
export type PaymentMutation = {
   expectedRevision: number;
   reason?: string;
   memberIds?: string[];
};
export type PaymentFile = {
   id: string;
   storageKey: string;
   mediaType: string;
   originalFilename: string;
   sizeBytes: number;
   sha256: string;
};

export const paymentDeadline = (
   now: Date,
   deadlines: (Date | null | undefined)[],
) =>
   new Date(
      Math.min(
         now.getTime() + 86_400_000,
         ...deadlines
            .filter((date): date is Date => !!date)
            .map((date) => date.getTime()),
      ),
   );

export const acknowledgementsComplete = (
   memberIds: string[],
   proofs: { orderMemberId: string; status: string }[],
   corrections: { resolvedAt: Date | null }[],
   seats: number,
) =>
   memberIds.length === seats &&
   seats > 0 &&
   !corrections.some((target) => !target.resolvedAt) &&
   memberIds.every((id) =>
      proofs.some(
         (proof) => proof.orderMemberId === id && proof.status === 'CURRENT',
      ),
   );
