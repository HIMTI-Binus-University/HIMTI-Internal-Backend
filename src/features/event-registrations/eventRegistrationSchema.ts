import { z } from 'zod';
import { FormValidationSchema } from '@/features/registration-forms/registrationFormSchema.js';

export const registrationIdParamsSchema = z.object({
   registrationId: z.string().min(1),
});

export const eventIdParamsSchema = z.object({ eventId: z.string().min(1) });
export const subEventIdParamsSchema = z.object({
   subEventId: z.string().min(1),
});

export const eventRegistrationPaginationSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const registrationDecisionSchema = z.object({
   revision: z.number().int().positive(),
   reason: z.string().trim().min(1).max(1000).optional(),
});

export const registrationReasonDecisionSchema =
   registrationDecisionSchema.extend({
      reason: z.string().trim().min(1).max(1000),
   });

export const bulkRegistrationDecisionSchema = z.object({
   items: z
      .array(
         z.object({
            registrationId: z.string().trim().min(1).max(100),
            revision: z.number().int().positive(),
         }),
      )
      .min(1)
      .max(50)
      .refine(
         (items) =>
            new Set(items.map((item) => item.registrationId)).size ===
            items.length,
         'registrationId values must be unique',
      ),
   reason: z.string().trim().min(1).max(1000).optional(),
});

export const bulkRegistrationReasonDecisionSchema =
   bulkRegistrationDecisionSchema.extend({
      reason: z.string().trim().min(1).max(1000),
   });

export const registrationContextQuerySchema = z.object({
   inviteToken: z.string().trim().min(1).max(512).optional(),
});

const normalizedEmailSchema = z
   .string()
   .trim()
   .email()
   .max(255)
   .transform((email) => email.toLowerCase());

export const createEventRegistrationSchema = z
   .object({
      packageId: z.string().min(1).optional(),
      inviteToken: z.string().trim().min(1).max(512).optional(),
      invitationEmails: z.array(normalizedEmailSchema).max(999).optional(),
   })
   .superRefine((value, context) => {
      const emails = value.invitationEmails ?? [];
      if (new Set(emails).size !== emails.length)
         context.addIssue({
            code: 'custom',
            path: ['invitationEmails'],
            message: 'Invitation emails must be unique',
         });
   });

export const invitationTokenSchema = z.object({
   token: z.string().trim().min(32).max(512),
});
export const createOrderInvitationSchema = z.object({
   email: normalizedEmailSchema,
   position: z.number().int().positive().max(1000),
});
export const invitationIdParamsSchema = registrationIdParamsSchema.extend({
   invitationId: z.string().trim().min(1).max(100),
});
export const resendOrderInvitationSchema = z.object({
   email: normalizedEmailSchema.optional(),
});

const boundedIdSchema = z.string().trim().min(1).max(100);
const decimal30x10Schema = z
   .string()
   .trim()
   .regex(/^-?(?:0|[1-9]\d{0,19})(?:\.\d{1,10})?$/, 'Invalid decimal value');

const answerBaseSchema = z.object({ questionId: boundedIdSchema });

export const typedAnswerSchema = z.discriminatedUnion('type', [
   answerBaseSchema.extend({
      type: z.literal('TEXT'),
      value: z.string().max(10000),
   }),
   answerBaseSchema.extend({
      type: z.literal('TEXTAREA'),
      value: z.string().max(10000),
   }),
   answerBaseSchema.extend({
      type: z.literal('NUMBER'),
      value: decimal30x10Schema,
   }),
   answerBaseSchema.extend({
      type: z.literal('DATE'),
      value: z.string().date(),
   }),
   answerBaseSchema.extend({
      type: z.literal('SELECT'),
      optionId: boundedIdSchema,
   }),
   answerBaseSchema.extend({
      type: z.literal('RADIO'),
      optionId: boundedIdSchema,
   }),
   answerBaseSchema.extend({
      type: z.literal('CHECKBOX'),
      optionIds: z.array(boundedIdSchema).min(1).max(100),
   }),
]);

export const replaceRegistrationResponsesSchema = z.object({
   submissions: z
      .array(
         z.object({
            submissionId: boundedIdSchema,
            revision: z.number().int().positive(),
            answers: z.array(typedAnswerSchema).max(200),
         }),
      )
      .min(1)
      .max(50)
      .superRefine((submissions, context) => {
         const ids = submissions.map((submission) => submission.submissionId);
         if (new Set(ids).size !== ids.length) {
            context.addIssue({
               code: 'custom',
               message: 'submissionId values must be unique',
            });
         }
         submissions.forEach((submission, index) => {
            const questionIds = submission.answers.map(
               (answer) => answer.questionId,
            );
            if (new Set(questionIds).size !== questionIds.length) {
               context.addIssue({
                  code: 'custom',
                  path: [index, 'answers'],
                  message: 'questionId values must be unique',
               });
            }
            submission.answers.forEach((answer, answerIndex) => {
               if (
                  answer.type === 'CHECKBOX' &&
                  new Set(answer.optionIds).size !== answer.optionIds.length
               ) {
                  context.addIssue({
                     code: 'custom',
                     path: [index, 'answers', answerIndex, 'optionIds'],
                     message: 'optionIds must be unique',
                  });
               }
            });
         });
      }),
});

export const submitRegistrationSchema = z.object({});
export const cancelRegistrationSchema = z.object({
   reason: z.string().trim().max(1000).optional(),
});

export const idempotencyKeySchema = z.string().trim().min(8).max(255);

export const publicSubEventSchema = z.object({
   id: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   date: z.string().datetime(),
   type: z.string(),
   locationName: z.string().nullable(),
   locationUrl: z.string().nullable(),
   posterUrl: z.string().nullable(),
   visibility: z.string(),
   status: z.string(),
   registrationMode: z.string(),
   isRegistrationOpen: z.boolean(),
});

export const publicEventSchema = z.object({
   id: z.string(),
   name: z.string(),
   publicDescription: z.string().nullable(),
   coverImageUrl: z.string().nullable(),
   status: z.literal('PUBLISHED'),
   subEvents: z.array(publicSubEventSchema),
});

export const packageSnapshotSchema = z.object({
   id: z.string(),
   code: z.string(),
   name: z.string(),
   seatCount: z.number().int(),
   currency: z.string(),
   priceMinor: z.string(),
   revision: z.number().int().optional(),
});

export const registrationOrderStatusSchema = z.enum([
   'DRAFT',
   'AWAITING_MEMBERS',
   'HOLDING',
   'SUBMITTED',
   'PENDING_PAYMENT',
   'PAYMENT_REVIEW',
   'PENDING_APPROVAL',
   'APPROVED',
   'NEEDS_CORRECTION',
   'WAITLISTED',
   'REJECTED',
   'EXPIRED',
   'CANCELLED',
]);

export const internalRegistrationListSchema =
   eventRegistrationPaginationSchema.extend({
      search: z.string().trim().max(255).optional(),
      status: registrationOrderStatusSchema.optional(),
      responseStatus: z
         .enum([
            'DRAFT',
            'SUBMITTED',
            'LOCKED',
            'NEEDS_CORRECTION',
            'SUPERSEDED',
         ])
         .optional(),
      paymentStatus: z.enum(['NOT_REQUIRED']).optional(),
      sort: z
         .enum([
            'submittedAt:asc',
            'submittedAt:desc',
            'createdAt:asc',
            'createdAt:desc',
         ])
         .default('submittedAt:asc'),
   });

export const internalQueueQuerySchema = internalRegistrationListSchema.omit({
   page: true,
   limit: true,
});

export const internalResponseStatusSchema = z.enum([
   'DRAFT',
   'SUBMITTED',
   'LOCKED',
   'NEEDS_CORRECTION',
   'SUPERSEDED',
]);

export const internalRegistrationSummarySchema = z.object({
   id: z.string(),
   orderNumber: z.string(),
   revision: z.number().int(),
   status: registrationOrderStatusSchema,
   responseStatus: internalResponseStatusSchema.nullable(),
   responseStatuses: z.array(internalResponseStatusSchema),
   paymentStatus: z.string().nullable(),
   seatCount: z.number().int(),
   package: packageSnapshotSchema,
   rosterSummary: z.object({
      activeMemberCount: z.number().int(),
      pendingSlotCount: z.number().int(),
      pendingInvitationCount: z.number().int(),
   }),
   readiness: z.object({
      claimedSeatCount: z.number().int(),
      requiredResponseCount: z.number().int(),
      completedResponseCount: z.number().int(),
      responsesComplete: z.boolean(),
      submittable: z.boolean(),
      blockerCodes: z.array(z.string()),
   }),
   participant: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      nim: z.string().nullable(),
   }),
   subEvent: z.object({
      id: z.string(),
      name: z.string(),
      date: z.string().datetime(),
   }),
   createdAt: z.string().datetime(),
   submittedAt: z.string().datetime().nullable(),
});

const internalSavedAnswerSchema = z.object({
   questionId: z.string(),
   type: z.string(),
   value: z.union([z.string(), z.array(z.string()), z.null()]),
   fileAvailable: z.boolean().optional(),
});

export const internalRegistrationDetailSchema =
   internalRegistrationSummarySchema.extend({
      answersVisible: z.boolean(),
      sections: z.array(
         z.object({
            id: z.string(),
            title: z.string(),
            orderIndex: z.number().int(),
            answers: z.array(
               z.object({
                  question: z.object({
                     id: z.string(),
                     label: z.string(),
                     fieldType: z.string(),
                  }),
                  answer: internalSavedAnswerSchema,
               }),
            ),
         }),
      ),
      history: z.array(
         z.object({
            id: z.string(),
            entityType: z.string(),
            fromStatus: z.string().nullable(),
            toStatus: z.string(),
            reason: z.string().nullable(),
            createdAt: z.string().datetime(),
            actor: z.object({ id: z.string(), name: z.string() }).nullable(),
         }),
      ),
   });

export const internalCapacitySchema = z.object({
   id: z.string(),
   name: z.string(),
   maxParticipants: z.number().int().nullable(),
   occupied: z.number().int(),
   liveHeldSeats: z.number().int(),
   reserved: z.number().int(),
   remaining: z.number().int().nullable(),
   byStatus: z.record(z.string(), z.number().int()),
});

export const internalQueueNeighborsSchema = z.object({
   previous: z.object({ id: z.string(), orderNumber: z.string() }).nullable(),
   next: z.object({ id: z.string(), orderNumber: z.string() }).nullable(),
});

export const internalReviewResultSchema = z.object({
   id: z.string(),
   status: registrationOrderStatusSchema,
   revision: z.number().int(),
});

export const formQuestionDefinitionSchema = z.object({
   id: z.string(),
   label: z.string(),
   fieldKey: z.string(),
   fieldType: z.string(),
   isRequired: z.boolean(),
   helpText: z.string().nullable(),
   validation: FormValidationSchema,
   orderIndex: z.number().int(),
   options: z.array(
      z.object({ id: z.string(), label: z.string(), value: z.string() }),
   ),
});

export const registrationFormDefinitionSchema = z.object({
   id: z.string(),
   name: z.string(),
   description: z.string().nullable(),
   audience: z.string(),
   isRequired: z.boolean(),
   orderIndex: z.number().int(),
   questions: z.array(formQuestionDefinitionSchema),
});

export const savedAnswerSchema = z.object({
   questionId: z.string(),
   type: z.string(),
   value: z.union([z.string(), z.array(z.string())]),
});

export const registrationSubmissionSchema = z.object({
   id: z.string(),
   formId: z.string(),
   status: z.enum([
      'DRAFT',
      'SUBMITTED',
      'LOCKED',
      'NEEDS_CORRECTION',
      'SUPERSEDED',
   ]),
   revision: z.number().int(),
   audience: z.string(),
   orderMemberId: z.string().nullable(),
   answers: z.array(savedAnswerSchema),
});

export const registrationSummarySchema = z.object({
   id: z.string(),
   orderNumber: z.string(),
   status: registrationOrderStatusSchema,
   event: z.object({ id: z.string(), name: z.string() }),
   subEvent: z.object({
      id: z.string(),
      name: z.string(),
      date: z.string().datetime(),
   }),
   package: packageSnapshotSchema,
   createdAt: z.string().datetime(),
   submittedAt: z.string().datetime().nullable(),
   cancelledAt: z.string().datetime().nullable(),
});

export const registrationDetailSchema = registrationSummarySchema.extend({
   correctionReason: z.string().nullable(),
   correctionDeadlineAt: z.string().datetime().nullable(),
   forms: z.array(registrationFormDefinitionSchema),
   submissions: z.array(registrationSubmissionSchema),
   viewer: z.object({
      role: z.enum(['BUYER', 'MEMBER']),
      capabilities: z.array(z.string()),
   }),
   memberDeadlineAt: z.string().datetime().nullable(),
   roster: z.array(
      z.object({
         position: z.number().int(),
         status: z.string(),
         isBuyer: z.boolean(),
         isSelf: z.boolean(),
         name: z.string().nullable(),
         email: z.string().email().nullable(),
         invitationId: z.string().nullable(),
      }),
   ),
   readiness: z.object({
      seatCount: z.number().int(),
      claimedSeatCount: z.number().int(),
      activeMemberCount: z.number().int(),
      pendingSlotCount: z.number().int(),
      readyMemberCount: z.number().int(),
      requiredResponseCount: z.number().int(),
      completedResponseCount: z.number().int(),
      responsesComplete: z.boolean(),
      submittable: z.boolean(),
      blockerCodes: z.array(z.string()),
      complete: z.boolean(),
   }),
   createdInvitations: z
      .array(
         z.object({
            registrationId: z.string(),
            position: z.number().int(),
            email: z.string().email(),
            token: z.string(),
            invitationPath: z.string(),
         }),
      )
      .optional(),
});

export const registrationContextSchema = z.object({
   action: z.enum([
      'REGISTER',
      'RESUME',
      'VIEW_REGISTRATION',
      'SIGN_IN',
      'EXTERNAL',
      'UNAVAILABLE',
   ]),
   code: z.string(),
   destinationUrl: z.string().nullable(),
   package: packageSnapshotSchema.nullable(),
   packages: z.array(packageSnapshotSchema),
   registrationId: z.string().nullable(),
   forms: z.array(registrationFormDefinitionSchema),
});

export const invitationMutationSchema = z.object({
   id: z.string(),
   registrationId: z.string(),
   position: z.number().int(),
   email: z.string().email(),
   status: z.string(),
   expiresAt: z.string().datetime(),
   token: z.string().optional(),
   invitationPath: z.string().optional(),
});

export const invitationContextSchema = z.object({
   invitation: invitationMutationSchema.omit({ token: true }),
   order: z.object({
      id: z.string(),
      orderNumber: z.string(),
      status: registrationOrderStatusSchema,
      event: z.object({ id: z.string(), name: z.string() }),
      subEvent: z.object({
         id: z.string(),
         name: z.string(),
         date: z.string().datetime(),
      }),
      package: packageSnapshotSchema,
      buyer: z.object({ name: z.string() }),
   }),
});

export const successSchema = <T extends z.ZodType>(data: T) =>
   z.object({ msg: z.literal('success'), data });

export const paginatedSuccessSchema = <T extends z.ZodType>(item: T) =>
   z.object({
      msg: z.literal('success'),
      data: z.array(item),
      meta: z.object({
         page: z.number().int(),
         limit: z.number().int(),
         totalRecords: z.number().int(),
         totalPages: z.number().int(),
      }),
   });
