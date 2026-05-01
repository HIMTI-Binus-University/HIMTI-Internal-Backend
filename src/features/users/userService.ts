import { User, Prisma } from '@prisma/client';
import { userRepository } from './userRepository.js';
import {
   GetUserSchema,
   UpdateUserRequest,
   GetUserResponse,
} from './userTypes.js';
import { auth } from '@/utils/auth.js';

class UserService {
   async getUsers(params: GetUserSchema): Promise<GetUserResponse> {
      const { data, total } = await userRepository.findAll(params);

      return {
         data: data.map(({ userHasRoles, ...user }) => ({
            ...user,
            roles: userHasRoles.map((uhr) => uhr.role),
         })),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async updateUser(
      payload: UpdateUserRequest,
      id: string,
      user: typeof auth.$Infer.Session.user,
   ): Promise<User> {
      const updatedUser: Prisma.UserUpdateInput = {
         name: payload.name,
         email: payload.email,
         outlookEmail: payload.outlookEmail,
         outlookEmailVerified: payload.outlookEmailVerified,
         image: payload.image,
         status: payload.status,
         nim: payload.nim,
         phoneNumber: payload.phoneNumber,
         lineId: payload.lineId,
         graduateBatch: payload.graduateBatch,
         university:
            payload.universityId !== undefined
               ? payload.universityId
                  ? { connect: { id: payload.universityId } }
                  : { disconnect: true }
               : undefined,
         studyProgram:
            payload.studyProgramId !== undefined
               ? payload.studyProgramId
                  ? { connect: { id: payload.studyProgramId } }
                  : { disconnect: true }
               : undefined,
         updatedBy: user.id,
      };
      return await userRepository.update(id, updatedUser);
   }

   async getUserById(id: string) {
      const user = await userRepository.findById(id);
      if (!user) return null;

      const { userHasRoles, ...rest } = user;

      const roles = userHasRoles.map(
         ({ role: { roleHasPermissions, ...role } }) => role,
      );

      // Merge all permissions from all roles, remove the duplicates using id
      const permissionMap = new Map<
         string,
         { id: string; name: string; status: string }
      >();
      for (const { role } of userHasRoles) {
         for (const { permission } of role.roleHasPermissions) {
            if (!permissionMap.has(permission.id)) {
               permissionMap.set(permission.id, permission);
            }
         }
      }

      return {
         ...rest,
         roles,
         permissions: Array.from(permissionMap.values()),
      };
   }
}

export const userService = new UserService();
