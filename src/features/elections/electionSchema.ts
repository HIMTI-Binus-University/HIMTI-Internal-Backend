import { z } from 'zod';

const dateTimeSchema = z.string().datetime({ offset: true });
const nullableUrlSchema = z.string().url().nullable().optional();

export const ElectionIdSchema = z.object({ electionId: z.string().min(1) });
export const CandidateIdSchema = z.object({ candidateId: z.string().min(1) });

export const CreateElectionSchema = z
   .object({
      slug: z
         .string()
         .trim()
         .min(3)
         .max(100)
         .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: z.string().trim().min(3).max(255),
      description: z.string().trim().max(10000).nullable().optional(),
      startsAt: dateTimeSchema,
      endsAt: dateTimeSchema,
      debateAt: dateTimeSchema.nullable().optional(),
   })
   .strict()
   .refine((value) => new Date(value.startsAt) < new Date(value.endsAt), {
      message: 'endsAt must be after startsAt',
      path: ['endsAt'],
   });

export const UpdateElectionSchema = z
   .object({
      slug: z
         .string()
         .trim()
         .min(3)
         .max(100)
         .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
         .optional(),
      title: z.string().trim().min(3).max(255).optional(),
      description: z.string().trim().max(10000).nullable().optional(),
      startsAt: dateTimeSchema.optional(),
      endsAt: dateTimeSchema.optional(),
      debateAt: dateTimeSchema.nullable().optional(),
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });

export const UpdateDebateScheduleSchema = z
   .object({ debateAt: dateTimeSchema.nullable() })
   .strict();

export const UpdateElectionPublicDetailsSchema = z
   .object({
      title: z.string().trim().min(3).max(255),
      slug: z
         .string()
         .trim()
         .min(3)
         .max(100)
         .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      description: z.string().trim().max(10000).nullable(),
   })
   .strict();

export const CreateCandidateSchema = z
   .object({
      ballotNumber: z.number().int().min(1),
      name: z.string().trim().min(2).max(255),
      photoUrl: nullableUrlSchema,
      biography: z.string().trim().max(10000).nullable().optional(),
      slogan: z.string().trim().max(1000).nullable().optional(),
      vision: z.string().trim().min(1).max(20000),
      mission: z.string().trim().min(1).max(20000),
      videoUrl: nullableUrlSchema,
      workPrograms: z
         .array(z.string().trim().min(1).max(500))
         .max(20)
         .optional(),
      experiences: z
         .array(z.string().trim().min(1).max(500))
         .max(30)
         .optional(),
      position: z.number().int().min(0).optional(),
      isActive: z.boolean().optional(),
   })
   .strict();

export const UpdateCandidateSchema = CreateCandidateSchema.partial()
   .strict()
   .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
   });

export const CastVoteSchema = z
   .object({ candidateId: z.string().min(1) })
   .strict();

export const EmptyElectionBodySchema = z.object({}).strict();
