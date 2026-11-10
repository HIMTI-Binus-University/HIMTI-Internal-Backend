import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function assertStudyClubSeedEnvironment(env = process.env) {
   if (!['development', 'test'].includes(env.NODE_ENV))
      throw new Error('Study Club demo seed runs only in development or test.');
   const url = new URL(env.DATABASE_URL ?? '');
   if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]', 'db'].includes(url.hostname)
   )
      throw new Error('Study Club demo seed requires a local database.');
}

export async function seedStudyClubs(prisma) {
   assertStudyClubSeedEnvironment();
   return prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({
         where: { email: 'system@himti.internal' },
         select: { id: true },
      });
      if (!actor) throw new Error('Run npm run seed first.');
      const courses = await tx.course.findMany({
         where: { status: 'ACTIVE' },
         select: { id: true, name: true },
         orderBy: { name: 'asc' },
      });
      if (!courses.length) throw new Error('Add an active course group first.');
      const topics = [
         ['Dynamic Programming', 'Algorithm & Programming', 1],
         ['Database Normalization', 'Database Systems', 2],
         ['Graph Algorithms', 'Algorithm & Programming', 3],
         ['Limits and Continuity', 'Calculus', 4],
         ['Operating Systems Review', 'Operating Systems', 5],
         ['Network Fundamentals', 'Computer Networks', 6],
         ['Computer Architecture Basics', 'Computer Architecture', 7],
         ['Mid Exam Practice', 'Calculus', 8],
         ['Pointers and Arrays', 'Algorithm & Programming', -3],
         ['SQL Practice', 'Database Systems', -7],
         ['Final Exam Discussion', 'Operating Systems', -10],
      ];
      const now = new Date();
      const wibDate = new Date(now.getTime() + 7 * 60 * 60 * 1000)
         .toISOString()
         .slice(0, 10);
      const start = Date.parse(`${wibDate}T10:00:00+07:00`);
      const rows = topics.map(([topic, courseName, days], index) => ({
         id: `demo-study-club-${index + 1}`,
         title: `[DEMO] ${topic}`,
         type: index % 3 === 0 ? 'Responsi' : 'Study Club',
         courseId: (
            courses.find((course) => course.name === courseName) ?? courses[0]
         ).id,
         description:
            'Dummy session for local development. Venue and capacity are examples, not a real schedule.',
         startsAt: new Date(start + days * 86_400_000),
         endsAt: new Date(start + days * 86_400_000 + 2 * 60 * 60 * 1000),
         location:
            index % 2 === 0 ? 'Demo room 301, Anggrek' : 'Demo online session',
         meetingUrl: '',
         registrationUrl: '',
         capacity: index % 2 === 0 ? 30 : null,
         isDemo: true,
         createdBy: actor.id,
         updatedBy: actor.id,
      }));
      rows.push({
         ...rows[0],
         id: 'demo-study-club-ongoing',
         title: '[DEMO] Live Study Club Practice',
         type: 'Study Club',
         startsAt: new Date(now.getTime() - 30 * 60 * 1000),
         endsAt: new Date(now.getTime() + 90 * 60 * 1000),
      });
      return tx.studyClubSession.createMany({
         data: rows,
         skipDuplicates: true,
      });
   });
}

if (
   process.argv[1] &&
   import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
   const prisma = new PrismaClient();
   try {
      const { count } = await seedStudyClubs(prisma);
      console.log(
         `Added ${count} demo Study Club sessions. Existing sessions were preserved.`,
      );
   } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
   } finally {
      await prisma.$disconnect();
   }
}
