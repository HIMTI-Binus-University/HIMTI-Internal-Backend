import { z } from 'zod';

const fields = {
   eventGroupId: z.string().min(1).nullable().optional(),
   name: z.string().trim().min(3).max(255),
   publicDescription: z.string().trim().nullable().optional(),
   internalDescription: z.string().trim().nullable().optional(),
   startsAt: z.coerce.date().nullable().optional(),
   endsAt: z.coerce.date().nullable().optional(),
   locationName: z.string().trim().max(255).nullable().optional(),
   locationAddress: z.string().trim().nullable().optional(),
   locationUrl: z.string().url().nullable().optional(),
   coverImageUrl: z.string().url().nullable().optional(),
   primaryColor: z.string().trim().max(20).nullable().optional(),
   secondaryColor: z.string().trim().max(20).nullable().optional(),
};

export const CreateEventSchema = z
   .object({
      ...fields,
      individualTicketPriceMinor: z.coerce.bigint().nonnegative().default(0n),
      individualTicketCurrency: z
         .string()
         .trim()
         .length(3)
         .toUpperCase()
         .default('IDR'),
   })
   .refine(
      (value) =>
         !value.startsAt || !value.endsAt || value.endsAt > value.startsAt,
      { message: 'endsAt must be after startsAt', path: ['endsAt'] },
   );
export const UpdateEventSchema = z.object(fields).partial();
export const EventListSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(20),
   search: z.string().trim().optional(),
   status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
});
export const OrganizerSchema = z.object({
   userId: z.string().min(1),
   role: z.enum(['MANAGER', 'ORGANIZER']).default('ORGANIZER'),
});
export const OrganizerUpdateSchema = OrganizerSchema.pick({ role: true });

const nullableTrimmed = (max: number) =>
   z.string().trim().min(1).max(max).nullable();

export const RegistrationSettingsSchema = z
   .object({
      isRegistrationOpen: z.boolean(),
      registrationOpensAt: z.coerce.date().nullable(),
      registrationClosesAt: z.coerce.date().nullable(),
      cancellationClosesAt: z.coerce.date().nullable(),
      capacity: z.number().int().positive().nullable(),
      paymentCurrency: z.string().trim().length(3).toUpperCase(),
      paymentBankName: nullableTrimmed(100),
      paymentAccountNumber: nullableTrimmed(100),
      paymentAccountHolder: nullableTrimmed(150),
      paymentInstructions: z.string().trim().min(1).nullable(),
      paymentProofTypes: z
         .array(
            z.enum([
               'image/jpeg',
               'image/png',
               'image/webp',
               'application/pdf',
            ]),
         )
         .min(1),
      paymentProofMaxBytes: z
         .number()
         .int()
         .min(1)
         .max(25 * 1024 * 1024),
      attendanceEnabled: z.boolean(),
      attendanceCheckoutEnabled: z.boolean(),
   })
   .strict()
   .superRefine((value, context) => {
      if (
         value.registrationOpensAt &&
         value.registrationClosesAt &&
         value.registrationClosesAt <= value.registrationOpensAt
      )
         context.addIssue({
            code: 'custom',
            path: ['registrationClosesAt'],
            message: 'registrationClosesAt must be after registrationOpensAt',
         });
      if (
         value.cancellationClosesAt &&
         value.registrationClosesAt &&
         value.cancellationClosesAt > value.registrationClosesAt
      )
         context.addIssue({
            code: 'custom',
            path: ['cancellationClosesAt'],
            message:
               'cancellationClosesAt cannot be after registrationClosesAt',
         });
      if (value.isRegistrationOpen && !value.registrationClosesAt)
         context.addIssue({
            code: 'custom',
            path: ['registrationClosesAt'],
            message:
               'registrationClosesAt is required while registration is open',
         });
      const paymentFields = [
         value.paymentBankName,
         value.paymentAccountNumber,
         value.paymentAccountHolder,
      ];
      if (paymentFields.some(Boolean) && !paymentFields.every(Boolean))
         context.addIssue({
            code: 'custom',
            path: ['paymentBankName'],
            message:
               'bank name, account number, and account holder are all required together',
         });
      if (value.attendanceCheckoutEnabled && !value.attendanceEnabled)
         context.addIssue({
            code: 'custom',
            path: ['attendanceCheckoutEnabled'],
            message: 'attendance checkout requires attendance to be enabled',
         });
   });
