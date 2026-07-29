import { z } from 'zod';

export const CommitteeRoleSchema = z.enum([
   'ADVISOR',
   'CHAIRPERSON',
   'VICE_CHAIRPERSON',
   'SECRETARY',
   'TREASURER',
   'COORDINATOR',
   'STAFF',
]);

export const AssignEventCommitteeSchema = z.object({
   eventId: z.string().min(1),
   userId: z.string().min(1),
   role: CommitteeRoleSchema.default('STAFF'),
});

export const UpdateEventCommitteeSchema = z.object({
   eventId: z.string().min(1),
   userId: z.string().min(1),
   role: CommitteeRoleSchema,
});

export const RemoveEventCommitteeSchema = z.object({
   eventId: z.string().min(1),
   userId: z.string().min(1),
});
