import { z } from 'zod';

export const MembershipResourcesSchema = z.object({
   period: z.object({ id: z.string(), label: z.string() }),
   groups: z.array(
      z.object({ id: z.string(), title: z.string(), url: z.string().url() }),
   ),
   contacts: z.array(
      z.object({
         id: z.string(),
         areas: z.array(z.string()),
         name: z.string(),
         phoneNumber: z.string(),
         contactUrl: z.string().url(),
      }),
   ),
});

export const MembershipResourcesResponseSchema = z.object({
   msg: z.literal('success'),
   data: MembershipResourcesSchema,
});
