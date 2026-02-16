import { PrismaClient, Prisma, User } from '@prisma/client';

const prisma = new PrismaClient();

class RegistRepository {
   async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
      return await prisma.user.update({
         where: { id },
         data,
      });
   }
}

export const registRepository = new RegistRepository();
