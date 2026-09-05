import { z } from 'zod';

const option = z.object({
   label: z.string().trim().min(1).max(255),
   value: z.string().trim().min(1).max(255),
});
const common = {
   fieldKey: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{1,99}$/),
   label: z.string().trim().min(1).max(255),
   isRequired: z.boolean().default(true),
};
const question = z.discriminatedUnion('type', [
   z.object({
      ...common,
      type: z.literal('TEXT'),
      options: z.array(option).max(0).default([]),
      validation: z
         .object({
            minLength: z.number().int().nonnegative().optional(),
            maxLength: z.number().int().positive().optional(),
         })
         .strict()
         .default({}),
   }),
   z.object({
      ...common,
      type: z.literal('TEXTAREA'),
      options: z.array(option).max(0).default([]),
      validation: z
         .object({
            minLength: z.number().int().nonnegative().optional(),
            maxLength: z.number().int().positive().optional(),
         })
         .strict()
         .default({}),
   }),
   z.object({
      ...common,
      type: z.literal('NUMBER'),
      options: z.array(option).max(0).default([]),
      validation: z
         .object({
            min: z.number().optional(),
            max: z.number().optional(),
            integer: z.boolean().optional(),
         })
         .strict()
         .default({}),
   }),
   z.object({
      ...common,
      type: z.literal('DATE'),
      options: z.array(option).max(0).default([]),
      validation: z
         .object({
            min: z.string().date().optional(),
            max: z.string().date().optional(),
         })
         .strict()
         .default({}),
   }),
   z.object({
      ...common,
      type: z.literal('SELECT'),
      options: z.array(option).min(2),
      validation: z.object({}).strict().default({}),
   }),
   z.object({
      ...common,
      type: z.literal('RADIO'),
      options: z.array(option).min(2),
      validation: z.object({}).strict().default({}),
   }),
   z.object({
      ...common,
      type: z.literal('CHECKBOX'),
      options: z.array(option).min(2),
      validation: z
         .object({
            minSelections: z.number().int().nonnegative().optional(),
            maxSelections: z.number().int().positive().optional(),
         })
         .strict()
         .default({}),
   }),
   z.object({
      ...common,
      type: z.literal('FILE'),
      options: z.array(option).max(0).default([]),
      validation: z
         .object({
            acceptedTypes: z.array(z.string().trim().min(1)).min(1),
            maxBytes: z
               .number()
               .int()
               .positive()
               .max(25 * 1024 * 1024),
         })
         .strict(),
   }),
]);

export const RegistrationFormBodySchema = z
   .object({
      name: z.string().trim().min(1).max(255),
      description: z.string().trim().min(1).nullable().default(null),
      sections: z
         .array(
            z.object({
               title: z.string().trim().min(1).max(255),
               description: z.string().trim().min(1).nullable().default(null),
               questions: z.array(question).min(1),
            }),
         )
         .min(1),
   })
   .strict();
