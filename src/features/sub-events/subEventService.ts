import { Subevent, Prisma } from '@prisma/client';
import { CreateSubEventRequest } from './subEventTypes.js';
import { auth } from '@/utils/auth.js';
import { subEventRepository } from './subEventRepository.js';

class SubEventService {
   async createSubEvent(
      payload: CreateSubEventRequest,
      user: typeof auth.$Infer.Session.user,
   ): Promise<Subevent> {
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
            payload.questions && payload.questions.length > 0
               ? {
                    create: {
                       creator: { connect: { id: user.id } },
                       status: 'DRAFT',
                       questions: {
                          create: payload.questions.map(
                             (q: any, index: any) => ({
                                label: q.label,
                                fieldKey: q.label,
                                fieldType: q.fieldType,
                                isRequired: q.isRequired,
                                helpText: q.helpText,
                                orderIndex: index,
                                creator: { connect: { id: user.id } },
                                // Add options if exists
                                options:
                                   q.options && q.options.length > 0
                                      ? {
                                           create: q.options.map(
                                              (opt: any) => ({
                                                 label: opt.label,
                                                 value: opt.value,
                                                 creator: {
                                                    connect: { id: user.id },
                                                 },
                                              }),
                                           ),
                                        }
                                      : undefined,
                             }),
                          ),
                       },
                    },
                 }
               : undefined,
      };
      return await subEventRepository.create(subEventData);
   }
}

export const subEventService = new SubEventService();
