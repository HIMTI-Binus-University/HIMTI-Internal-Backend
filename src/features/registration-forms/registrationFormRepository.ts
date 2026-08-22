import { FormQuestion, FormQuestionOption, Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma.js';
import { randomUUID } from 'node:crypto';
import { AppError } from '@/utils/appError.js';
import { assignPublishedPostRegistrationForms } from '@/features/post-registration-forms/postRegistrationFormRepository.js';

export const getTemporarySectionOrderOffset = (
   maximumOrder: number | null,
   existingCount: number,
   incomingCount: number,
) => (maximumOrder ?? 0) + existingCount + incomingCount + 1;

class RegistrationFormRepository {
   private readonly builderInclude = {
      subEvent: { select: { eventId: true } },
      sections: {
         orderBy: { orderIndex: 'asc' as const },
         include: {
            questions: {
               orderBy: { orderIndex: 'asc' as const },
               include: {
                  options: { orderBy: { orderIndex: 'asc' as const } },
               },
            },
         },
      },
      assignments: {
         orderBy: [{ orderIndex: 'asc' as const }, { id: 'asc' as const }],
      },
   };

   async findFormById(id: string) {
      return await prisma.registrationForm.findFirst({
         where: { id, deletedAt: null },
         include: {
            subEvent: {
               select: {
                  eventId: true,
               },
            },
         },
      });
   }

   async findSubEventForForm(id: string) {
      return await prisma.subevent.findUnique({
         where: { id },
         select: { id: true, eventId: true },
      });
   }

   async findQuestionsByFormId(registrationFormId: string) {
      return await prisma.formQuestion.findMany({
         where: {
            registrationFormId,
         },
         select: {
            id: true,
            fieldKey: true,
            orderIndex: true,
            status: true,
         },
      });
   }

   async findBuilderFormById(id: string) {
      return await prisma.registrationForm.findFirst({
         where: { id, deletedAt: null },
         include: this.builderInclude,
      });
   }

   async findFormsBySubEventId(subEventId: string) {
      return await prisma.registrationForm.findMany({
         where: { subEventId, logicalKey: { not: null }, deletedAt: null },
         orderBy: [{ logicalKey: 'asc' }, { version: 'desc' }],
         include: this.builderInclude,
      });
   }

   async findPublishedVersion(subEventId: string, logicalKey: string) {
      return await prisma.registrationForm.findFirst({
         where: {
            subEventId,
            logicalKey,
            status: 'PUBLISHED',
            deletedAt: null,
            subEvent: {
               status: 'OPEN',
               registrationMode: { not: 'DISABLED' },
               event: { status: 'PUBLISHED' },
            },
         },
         orderBy: { version: 'desc' },
         include: this.builderInclude,
      });
   }

   async createBuilderForm(data: Prisma.RegistrationFormUncheckedCreateInput) {
      return await prisma.registrationForm.create({
         data,
         include: this.builderInclude,
      });
   }

   async saveCompleteDraft(
      formId: string,
      expectedRevision: number,
      userId: string,
      metadata: {
         name: string;
         description?: string | null;
         stage: 'REGISTRATION' | 'POST_REGISTRATION';
      },
      sections: Array<{
         id?: string;
         title: string;
         description?: string | null;
         questions: Array<{
            id?: string;
            label: string;
            fieldKey: string;
            fieldType: Prisma.FormQuestionCreateManyInput['fieldType'];
            isRequired: boolean;
            helpText?: string | null;
            validation: Prisma.InputJsonValue;
            options: Array<{ id?: string; label: string; value: string }>;
         }>;
      }>,
      assignments: Array<{
         ticketPackageId: string | null;
         audience: Prisma.RegistrationFormAssignmentCreateManyInput['audience'];
         isRequired: boolean;
         blocksCheckIn: boolean;
         orderIndex: number;
         opensAt: Date | null;
         closesAt: Date | null;
      }>,
   ) {
      return await prisma.$transaction(async (tx) => {
         const revisionUpdate = await tx.registrationForm.updateMany({
            where: { id: formId, status: 'DRAFT', revision: expectedRevision },
            data: {
               ...metadata,
               revision: { increment: 1 },
               updatedBy: userId,
            },
         });
         if (revisionUpdate.count !== 1) return null;

         const suppliedSectionIds = sections.flatMap((section) =>
            section.id ? [section.id] : [],
         );
         const suppliedQuestions = sections.flatMap((section) =>
            section.questions.flatMap((question) =>
               question.id
                  ? [{ id: question.id, options: question.options }]
                  : [],
            ),
         );
         const suppliedQuestionIds = suppliedQuestions.map(({ id }) => id);
         const suppliedOptionIds = suppliedQuestions.flatMap(({ options }) =>
            options.flatMap((option) => (option.id ? [option.id] : [])),
         );
         const [scopedSections, scopedQuestions, scopedOptions] =
            await Promise.all([
               tx.registrationFormSection.findMany({
                  where: {
                     registrationFormId: formId,
                     id: { in: suppliedSectionIds },
                  },
                  select: { id: true },
               }),
               tx.formQuestion.findMany({
                  where: {
                     registrationFormId: formId,
                     id: { in: suppliedQuestionIds },
                  },
                  select: { id: true },
               }),
               tx.formQuestionOption.findMany({
                  where: {
                     id: { in: suppliedOptionIds },
                     question: { registrationFormId: formId },
                  },
                  select: { id: true, formQuestionId: true },
               }),
            ]);
         if (
            scopedSections.length !== suppliedSectionIds.length ||
            scopedQuestions.length !== suppliedQuestionIds.length ||
            scopedOptions.length !== suppliedOptionIds.length
         )
            throw new AppError(
               'Draft child scope changed during save',
               409,
               'DRAFT_SCOPE_CONFLICT',
            );
         const optionParents = new Map(
            scopedOptions.map((option) => [option.id, option.formQuestionId]),
         );
         if (
            suppliedQuestions.some(({ id, options }) =>
               options.some(
                  (option) => option.id && optionParents.get(option.id) !== id,
               ),
            )
         )
            throw new AppError(
               'Draft option parent changed during save',
               409,
               'DRAFT_SCOPE_CONFLICT',
            );

         const sectionOrder = await tx.registrationFormSection.aggregate({
            where: { registrationFormId: formId },
            _max: { orderIndex: true },
            _count: { id: true },
         });
         const temporaryOrderOffset = getTemporarySectionOrderOffset(
            sectionOrder._max.orderIndex,
            sectionOrder._count.id,
            sections.length,
         );
         await tx.registrationFormSection.updateMany({
            where: { registrationFormId: formId },
            data: {
               status: 'INACTIVE',
               orderIndex: { increment: temporaryOrderOffset },
            },
         });
         await tx.formQuestion.updateMany({
            where: { registrationFormId: formId },
            data: { status: 'INACTIVE', updatedBy: userId },
         });
         await tx.formQuestionOption.updateMany({
            where: { question: { registrationFormId: formId } },
            data: { isActive: false, updatedBy: userId },
         });
         await tx.registrationFormAssignment.deleteMany({
            where: { registrationFormId: formId },
         });
         await tx.registrationFormAssignment.createMany({
            data: assignments.map((assignment) => ({
               registrationFormId: formId,
               ...assignment,
            })),
         });

         for (const [sectionIndex, section] of sections.entries()) {
            const savedSection = section.id
               ? await (async () => {
                    const updated = await tx.registrationFormSection.updateMany(
                       {
                          where: { id: section.id, registrationFormId: formId },
                          data: {
                             title: section.title,
                             description: section.description,
                             orderIndex: sectionIndex,
                             status: 'ACTIVE',
                          },
                       },
                    );
                    if (updated.count !== 1)
                       throw new AppError(
                          'Draft section scope changed during save',
                          409,
                          'DRAFT_SCOPE_CONFLICT',
                       );
                    return await tx.registrationFormSection.findUniqueOrThrow({
                       where: { id: section.id },
                    });
                 })()
               : await tx.registrationFormSection.create({
                    data: {
                       registrationFormId: formId,
                       title: section.title,
                       description: section.description,
                       orderIndex: sectionIndex,
                    },
                 });

            for (const [
               questionIndex,
               question,
            ] of section.questions.entries()) {
               const questionData = {
                  sectionId: savedSection.id,
                  label: question.label,
                  fieldKey: question.fieldKey,
                  fieldType: question.fieldType,
                  isRequired: question.isRequired,
                  helpText: question.helpText,
                  validation: question.validation,
                  orderIndex: questionIndex,
                  status: 'ACTIVE' as const,
                  updatedBy: userId,
               };
               const savedQuestion = question.id
                  ? await (async () => {
                       const updated = await tx.formQuestion.updateMany({
                          where: {
                             id: question.id,
                             registrationFormId: formId,
                          },
                          data: questionData,
                       });
                       if (updated.count !== 1)
                          throw new AppError(
                             'Draft question scope changed during save',
                             409,
                             'DRAFT_SCOPE_CONFLICT',
                          );
                       return await tx.formQuestion.findUniqueOrThrow({
                          where: { id: question.id },
                       });
                    })()
                  : await tx.formQuestion.create({
                       data: {
                          ...questionData,
                          registrationFormId: formId,
                          createdBy: userId,
                       },
                    });

               for (const [optionIndex, option] of question.options.entries()) {
                  const optionData = {
                     label: option.label,
                     value: option.value,
                     orderIndex: optionIndex,
                     isActive: true,
                     updatedBy: userId,
                  };
                  if (option.id)
                     await (async () => {
                        const updated = await tx.formQuestionOption.updateMany({
                           where: {
                              id: option.id,
                              formQuestionId: savedQuestion.id,
                           },
                           data: optionData,
                        });
                        if (updated.count !== 1)
                           throw new AppError(
                              'Draft option scope changed during save',
                              409,
                              'DRAFT_SCOPE_CONFLICT',
                           );
                     })();
                  else
                     await tx.formQuestionOption.create({
                        data: {
                           ...optionData,
                           formQuestionId: savedQuestion.id,
                           createdBy: userId,
                        },
                     });
               }
            }
         }
         return await tx.registrationForm.findUnique({
            where: { id: formId },
            include: this.builderInclude,
         });
      });
   }

   async updateLifecycle(
      id: string,
      expectedStatus: 'DRAFT' | 'PUBLISHED',
      expectedRevision: number,
      status: 'PUBLISHED' | 'CLOSED',
      userId: string,
   ) {
      try {
         return await prisma.$transaction(
            async (tx) => {
               const form = await tx.registrationForm.findUnique({
                  where: { id },
               });
               if (!form) return null;
               if (status === 'PUBLISHED' && form.stage === 'REGISTRATION') {
                  const assignmentCount =
                     await tx.registrationFormAssignment.count({
                        where: { registrationFormId: id },
                     });
                  if (assignmentCount === 0)
                     await tx.registrationFormAssignment.create({
                        data: {
                           registrationFormId: id,
                           ticketPackageId: null,
                           audience: 'EACH_ATTENDEE',
                           isRequired: true,
                           orderIndex: 0,
                           opensAt: null,
                           closesAt: null,
                        },
                     });
               }
               if (status === 'PUBLISHED' && form.logicalKey) {
                  await tx.registrationForm.updateMany({
                     where: {
                        logicalKey: form.logicalKey,
                        subEventId: form.subEventId,
                        status: 'PUBLISHED',
                        id: { not: id },
                     },
                     data: { status: 'CLOSED', updatedBy: userId },
                  });
               }
               const transitioned = await tx.registrationForm.updateMany({
                  where: {
                     id,
                     status: expectedStatus,
                     revision: expectedRevision,
                  },
                  data: {
                     status,
                     publishedAt:
                        status === 'PUBLISHED' ? new Date() : undefined,
                     revision: { increment: 1 },
                     updatedBy: userId,
                  },
               });
               if (transitioned.count !== 1)
                  throw new AppError(
                     'Form lifecycle changed since it was loaded',
                     409,
                     'LIFECYCLE_CONFLICT',
                  );
               if (status === 'PUBLISHED' && form.stage === 'POST_REGISTRATION')
                  await assignPublishedPostRegistrationForms(tx, {
                     subEventId: form.subEventId,
                     formId: id,
                  });
               return await tx.registrationForm.findUnique({
                  where: { id },
                  include: this.builderInclude,
               });
            },
            {
               isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
         );
      } catch (error) {
         if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === 'P2002' || error.code === 'P2034')
         )
            throw new AppError(
               'Form lifecycle conflicted with another update',
               409,
               'LIFECYCLE_CONFLICT',
            );
         throw error;
      }
   }

   async findFormRevision(id: string) {
      return await prisma.registrationForm.findUnique({
         where: { id },
         select: { revision: true, status: true },
      });
   }

   async softDeleteDraft(id: string, expectedRevision: number, userId: string) {
      const deletedAt = new Date();
      const result = await prisma.registrationForm.updateMany({
         where: {
            id,
            status: 'DRAFT',
            revision: expectedRevision,
            deletedAt: null,
         },
         data: {
            deletedAt,
            deletedBy: userId,
            updatedBy: userId,
            revision: { increment: 1 },
         },
      });
      if (result.count !== 1) return null;
      return await prisma.registrationForm.findUnique({
         where: { id },
         include: this.builderInclude,
      });
   }

   async cloneIndependent(
      source: NonNullable<
         Awaited<ReturnType<RegistrationFormRepository['findBuilderFormById']>>
      >,
      name: string,
      userId: string,
   ) {
      return await prisma.$transaction(async (tx) => {
         const cloneId = randomUUID();
         return await tx.registrationForm.create({
            data: {
               id: cloneId,
               subEventId: source.subEventId,
               logicalKey: randomUUID(),
               version: 1,
               supersedesId: null,
               name,
               description: source.description,
               stage: source.stage,
               createdBy: userId,
               sections: {
                  create: source.sections
                     .filter((section) => section.status === 'ACTIVE')
                     .map((section) => ({
                        title: section.title,
                        description: section.description,
                        orderIndex: section.orderIndex,
                        questions: {
                           create: section.questions
                              .filter(
                                 (question) => question.status === 'ACTIVE',
                              )
                              .map((question) => ({
                                 label: question.label,
                                 fieldKey: question.fieldKey,
                                 fieldType: question.fieldType,
                                 isRequired: question.isRequired,
                                 helpText: question.helpText,
                                 validation: question.validation ?? {},
                                 orderIndex: question.orderIndex,
                                 form: { connect: { id: cloneId } },
                                 creator: { connect: { id: userId } },
                                 options: {
                                    create: question.options
                                       .filter((option) => option.isActive)
                                       .map((option) => ({
                                          label: option.label,
                                          value: option.value,
                                          orderIndex: option.orderIndex,
                                          creator: { connect: { id: userId } },
                                       })),
                                 },
                              })),
                        },
                     })),
               },
               assignments: {
                  create: source.assignments.map((assignment) => ({
                     ticketPackageId: assignment.ticketPackageId,
                     audience: assignment.audience,
                     isRequired: assignment.isRequired,
                     blocksCheckIn: assignment.blocksCheckIn,
                     orderIndex: assignment.orderIndex,
                     opensAt: assignment.opensAt,
                     closesAt: assignment.closesAt,
                  })),
               },
            },
            include: this.builderInclude,
         });
      });
   }

   async findQuestionById(id: string) {
      return await prisma.formQuestion.findUnique({
         where: { id },
         include: {
            form: {
               select: {
                  id: true,
                  status: true,
                  logicalKey: true,
                  subEvent: {
                     select: {
                        eventId: true,
                     },
                  },
               },
            },
            options: true,
         },
      });
   }

   async createQuestion(data: Prisma.FormQuestionCreateInput) {
      return await prisma.formQuestion.create({
         data,
         include: {
            options: true,
         },
      });
   }

   async countResponsesForForm(formId: string): Promise<number> {
      return await prisma.registrationResponse.count({
         where: {
            registrationFormId: formId,
         },
      });
   }

   async reorderQuestions(
      formId: string,
      questionIds: string[],
      userId: string,
   ) {
      return await prisma.$transaction(async (tx) => {
         await Promise.all(
            questionIds.map((questionId, orderIndex) =>
               tx.formQuestion.update({
                  where: { id: questionId },
                  data: {
                     orderIndex,
                     updater: {
                        connect: {
                           id: userId,
                        },
                     },
                  },
               }),
            ),
         );

         return await tx.formQuestion.findMany({
            where: {
               registrationFormId: formId,
               status: 'ACTIVE',
            },
            orderBy: {
               orderIndex: 'asc',
            },
            include: {
               options: true,
            },
         });
      });
   }

   async updateQuestion(
      id: string,
      data: Prisma.FormQuestionUpdateInput,
   ): Promise<FormQuestion> {
      return await prisma.formQuestion.update({
         where: { id },
         data,
         include: {
            options: true,
         },
      });
   }

   async deleteQuestion(id: string, userId: string): Promise<FormQuestion> {
      return await prisma.$transaction(async (tx) => {
         await tx.formQuestionOption.updateMany({
            where: {
               formQuestionId: id,
            },
            data: {
               isActive: false,
               updatedBy: userId,
            },
         });

         return await tx.formQuestion.update({
            where: { id },
            data: {
               status: 'INACTIVE',
               updater: {
                  connect: {
                     id: userId,
                  },
               },
            },
            include: {
               options: true,
            },
         });
      });
   }

   async findOptionById(id: string) {
      return await prisma.formQuestionOption.findUnique({
         where: { id },
         include: {
            question: {
               include: {
                  form: {
                     select: {
                        id: true,
                        status: true,
                        logicalKey: true,
                        subEvent: {
                           select: {
                              eventId: true,
                           },
                        },
                     },
                  },
               },
            },
         },
      });
   }

   async findActiveOptionByValue(
      formQuestionId: string,
      value: string,
      excludeId?: string,
   ) {
      return await prisma.formQuestionOption.findFirst({
         where: {
            formQuestionId,
            value,
            isActive: true,
            ...(excludeId && { id: { not: excludeId } }),
         },
      });
   }

   async countActiveOptionsForQuestion(
      formQuestionId: string,
   ): Promise<number> {
      return await prisma.formQuestionOption.count({
         where: {
            formQuestionId,
            isActive: true,
         },
      });
   }

   async createQuestionOption(
      data: Prisma.FormQuestionOptionCreateInput,
   ): Promise<FormQuestionOption> {
      return await prisma.formQuestionOption.create({ data });
   }

   async updateQuestionOption(
      id: string,
      data: Prisma.FormQuestionOptionUpdateInput,
   ): Promise<FormQuestionOption> {
      return await prisma.formQuestionOption.update({
         where: { id },
         data,
      });
   }

   async deleteQuestionOption(
      id: string,
      userId: string,
   ): Promise<FormQuestionOption> {
      return await prisma.formQuestionOption.update({
         where: { id },
         data: {
            isActive: false,
            updater: {
               connect: {
                  id: userId,
               },
            },
         },
      });
   }
}

export const registrationFormRepository = new RegistrationFormRepository();
