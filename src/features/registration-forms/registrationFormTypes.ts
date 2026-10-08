import { z } from 'zod';
import { RegistrationFormBodySchema } from './registrationFormSchema.js';

export type RegistrationFormBody = z.infer<typeof RegistrationFormBodySchema>;
export const reservedProfileKeys = new Set([
   'name',
   'nim',
   'outlook_email',
   'email',
   'personal_email',
   'university',
   'study_program',
   'region',
   'phone_number',
   'whatsapp',
]);
