import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const title = z.string().trim().min(1);
export const publicSummaryParams = z.object({ id });

export const publicCourseSchema = z.object({
   id,
   name: title,
   code: title,
   semester: z.number().int().positive(),
   description: z.string(),
});

export const publicSummaryMetadataSchema = z.object({
   id,
   title,
   courseId: id,
   academicPeriod: title,
   semester: z.number().int().positive(),
   examType: z.enum(['Mid Exam', 'Final Exam']),
   contributors: z.array(z.object({ id, displayName: title })),
});

export const publicEventSchema = z
   .object({
      id,
      title,
      courseId: id,
      type: z.enum(['Study Club', 'Responsi']),
      startsAt: z.iso.datetime(),
      endsAt: z.iso.datetime(),
      location: z.string(),
      description: z.string(),
      recordingUrl: z.string().optional(),
      quota: z.number().int().nonnegative().optional(),
   })
   .refine((event) => Date.parse(event.endsAt) > Date.parse(event.startsAt));

export const publicCatalogSchema = z.object({
   courses: z.array(publicCourseSchema),
   summaries: z.array(publicSummaryMetadataSchema),
   events: z.array(publicEventSchema),
});

export const publicSummarySchema = publicSummaryMetadataSchema.extend({
   content: z.object({
      type: z.literal('doc'),
      content: z.array(z.object({ type: z.string() }).passthrough()),
   }),
});

export const publicErrorSchema = z.object({
   error: z.object({ code: z.string(), message: z.string() }),
});
