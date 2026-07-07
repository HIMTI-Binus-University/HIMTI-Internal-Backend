import { Subevent, Prisma } from '@prisma/client';
import type {
   CreateSubEventRequest,
   UpdateSubEventRequest,
} from './subEventTypes.js';
import { auth } from '@/utils/auth.js';
import { subEventRepository } from './subEventRepository.js';
import { generateUniqueFieldKeys } from '@/utils/fieldKey.js';
import { eventCommitteeService } from '@/features/event-committee/eventCommitteeService.js';
import { AppError } from '@/utils/appError.js';

class SubEventService {
   async createSubEvent(
      payload: CreateSubEventRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Subevent> {
      await eventCommitteeService.assertEventCommitteeMember(
         payload.eventId,
         user.id,
      );

      const questions = payload.questions ?? [];
      const fieldKeys = generateUniqueFieldKeys(
         questions.map((question) => question.label),
      );

      const subEventData: Prisma.SubeventCreateInput = {
         // Relational connects to other tables
         event: {
            connect: {
               id: payload.eventId,
            },
         },
         creator: {
            connect: {
               id: user.id,
            },
         },

         // Base fields
         name: payload.name,
         publicDescription: payload.publicDescription,
         privateDescription: payload.privateDescription,
         date: new Date(payload.date),
         type: payload.type,
         locationName: payload.locationName,
         locationUrl: payload.locationUrl,
         price: payload.price,
         paid: payload.paid,
         paymentAccountBank: payload.paymentAccountBank || '',
         paymentAccountNumber: payload.paymentAccountNumber || null,
         paymentAccountName: payload.paymentAccountName || null,
         priceModifier: payload.priceModifier,
         paymentDesc: payload.paymentDesc || '',
         maxParticipants: payload.maxParticipants,
         maxTicketsPerUser: payload.maxTicketsPerUser,

         // Build the regist form if exists
         registrationForms:
            questions.length > 0
               ? {
                    create: {
                       creator: { connect: { id: user.id } },
                       status: 'DRAFT',
                       questions: {
                          create: questions.map((question, index) => ({
                             label: question.label,
                             fieldKey: fieldKeys[index],
                             fieldType: question.fieldType,
                             isRequired: question.isRequired,
                             helpText: question.helpText,
                             orderIndex: index,
                             creator: { connect: { id: user.id } },
                             // Add options if exists
                             options:
                                question.options && question.options.length > 0
                                   ? {
                                        create: question.options.map((opt) => ({
                                           label: opt.label,
                                           value: opt.value,
                                           creator: {
                                              connect: { id: user.id },
                                           },
                                        })),
                                     }
                                   : undefined,
                          })),
                       },
                    },
                 }
               : undefined,
      };
      return await subEventRepository.create(subEventData);
   }

   async updateSubEvent(
      payload: UpdateSubEventRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Subevent> {
      const subEvent = await subEventRepository.findById(id);

      if (!subEvent) {
         throw new AppError('Sub-event not found', 404);
      }

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         subEvent.eventId,
         user,
      );

      if (payload.status === 'CANCELLED') {
         return await subEventRepository.cancelSubEvent(id, user.id);
      }

      const nextStatus = payload.status ?? subEvent.status;

      if (payload.isRegistrationOpen === true && nextStatus !== 'OPEN') {
         throw new AppError(
            'Registration can only be opened for OPEN sub-events',
            400,
         );
      }

      const updateData: Prisma.SubeventUpdateInput = {
         name: payload.name,
         publicDescription: payload.publicDescription,
         privateDescription: payload.privateDescription,
         date: payload.date ? new Date(payload.date) : undefined,
         type: payload.type,
         locationName: payload.locationName,
         locationUrl: payload.locationUrl,
         price: payload.price,
         paid: payload.paid,
         paymentAccountBank: payload.paymentAccountBank,
         paymentAccountNumber: payload.paymentAccountNumber,
         paymentAccountName: payload.paymentAccountName,
         priceModifier: payload.priceModifier,
         paymentDesc: payload.paymentDesc,
         maxParticipants: payload.maxParticipants,
         maxTicketsPerUser: payload.maxTicketsPerUser,
         isRegistrationOpen:
            payload.status && payload.status !== 'OPEN'
               ? false
               : payload.isRegistrationOpen,
         autoAcceptRegistration: payload.autoAcceptRegistration,
         visibility: payload.visibility,
         status: payload.status,
         updater: {
            connect: {
               id: user.id,
            },
         },
      };

      return await subEventRepository.update(id, updateData);
   }

   async deleteSubEvent(
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Subevent> {
      const subEvent = await subEventRepository.findById(id);

      if (!subEvent) {
         throw new AppError('Sub-event not found', 404);
      }

      await eventCommitteeService.assertEventSteeringCommitteeMemberOrAdmin(
         subEvent.eventId,
         user,
      );

      return await subEventRepository.cancelSubEvent(id, user.id);
   }
}

export const subEventService = new SubEventService();
