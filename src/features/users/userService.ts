import { userRepository } from './userRepository.js';
import { registService } from '@/features/registration/registService.js';
import type {
   ManageRegistrationsQuery,
   ManageRegistrationUpdate,
} from './userTypes.js';

class UserService {
   async getRegistrations(params: ManageRegistrationsQuery) {
      const { data, total } = await userRepository.findRegistrations(params);
      const totalPages = Math.ceil(total / params.limit);
      return {
         data: data.map(({ userHasRoles, ...user }) => ({
            ...user,
            roles: userHasRoles.map(({ role }) => role),
         })),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages,
            previousPage: params.page > 1 ? params.page - 1 : null,
            nextPage: params.page < totalPages ? params.page + 1 : null,
         },
      };
   }

   getRegistrationById(id: string) {
      return userRepository.findRegistrationById(id).then((user) => {
         if (!user) return null;
         const { userHasRoles, ...data } = user;
         return { ...data, roles: userHasRoles.map(({ role }) => role) };
      });
   }

   getRegistrationSummary() {
      return userRepository.registrationSummary();
   }

   async updateRegistration(
      id: string,
      payload: ManageRegistrationUpdate,
      updatedBy: string,
   ) {
      const current = await userRepository.findRegistrationById(id);
      if (!current) return null;
      const binusEmailChanged =
         payload.binusEmail !== undefined &&
         payload.binusEmail?.toLowerCase() !== current.binusEmail;
      return userRepository.update(id, {
         ...payload,
         ...(payload.binusEmail !== undefined && {
            binusEmail: payload.binusEmail?.toLowerCase() ?? null,
         }),
         ...(payload.binusRegionId !== undefined && {
            binusRegion: payload.binusRegionId
               ? { connect: { id: payload.binusRegionId } }
               : { disconnect: true },
            binusRegionId: undefined,
         }),
         ...(binusEmailChanged && {
            binusEmailVerified: false,
            binusEmailVerifiedAt: null,
         }),
         updatedBy,
      });
   }

   async resendRegistrationVerification(id: string) {
      const user = await userRepository.findRegistrationById(id);
      if (!user) return null;
      if (!user.binusEmail || user.binusEmailVerified) return false;
      await registService.sendVerification(user.id, user.binusEmail);
      return true;
   }

   async exportRegistrations(params: ManageRegistrationsQuery) {
      const { data } = await userRepository.findRegistrations(params, false);
      const columns = [
         'id',
         'name',
         'email',
         'binusEmail',
         'binusEmailVerified',
         'memberType',
         'institutionType',
         'binusRegion',
         'nim',
         'universityName',
         'studyProgramName',
         'graduateBatch',
         'department',
         'affiliation',
         'phoneNumber',
         'lineId',
         'status',
         'registrationCompletedAt',
         'createdAt',
      ];
      const escape = (value: unknown) => {
         const text = value == null ? '' : String(value);
         return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
      };
      return [
         columns.join(','),
         ...data.map((row) =>
            columns
               .map((column) =>
                  escape(
                     column === 'binusRegion'
                        ? row.binusRegion?.name
                        : row[column as keyof typeof row],
                  ),
               )
               .join(','),
         ),
      ].join('\r\n');
   }
}

export const userService = new UserService();
