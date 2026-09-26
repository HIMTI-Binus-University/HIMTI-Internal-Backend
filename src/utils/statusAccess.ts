import { AppError } from './appError.js';

type StatusFilter = 'ACTIVE' | 'INACTIVE';

type SessionUserWithRoles = {
   roles?: unknown;
};

export const isAdminUser = (user: SessionUserWithRoles) => {
   return Array.isArray(user.roles) && user.roles.includes('Admin');
};

export const getAuthorizedStatusFilter = (
   status: StatusFilter | undefined,
   user: SessionUserWithRoles,
): StatusFilter => {
   const effectiveStatus = status ?? 'ACTIVE';

   if (effectiveStatus === 'INACTIVE' && !isAdminUser(user)) {
      throw new AppError('You are not allowed to view inactive records', 403);
   }

   return effectiveStatus;
};
