import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const electionId = 'demo-election';
const slug = 'demo-election';

export async function seedElection(prisma, { reset = false } = {}) {
   return prisma.$transaction(
      async (tx) => {
         const existing = await tx.election.findUnique({
            where: { id: electionId },
         });
         if (existing && existing.slug !== slug) {
            throw new Error(
               'Demo election identity collision; refusing to change it.',
            );
         }
         const other = await tx.election.findFirst({
            where: { status: 'OPEN', id: { not: electionId } },
         });
         if (other)
            throw new Error(
               'Close the other open election in admin before seeding.',
            );
         if (existing && !reset) return 'unchanged';

         const creator = await tx.user.findUnique({
            where: { email: 'system@himti.internal' },
         });
         const program = await tx.studyProgram.findUnique({
            where: { name: 'Computer Science - Regular Class' },
         });
         if (!creator || !program) {
            throw new Error(
               'Reference data is missing. Run npm run seed first.',
            );
         }
         const now = Date.now();
         const day = 86_400_000;
         const window = {
            status: 'OPEN',
            startsAt: new Date(now - day),
            endsAt: new Date(
               Math.max(now + 7 * day, existing?.originalEndsAt.getTime() ?? 0),
            ),
            debateAt: new Date(now - 3 * day),
            secondDebateAt: new Date(now - 2 * day),
            openedAt: new Date(now - day),
            closedAt: null,
            publishedAt: null,
         };
         if (existing) {
            // Reset only this demo's votes, including votes cast manually during testing.
            await tx.electionBallot.deleteMany({ where: { electionId } });
            await tx.electionParticipation.deleteMany({
               where: { electionId },
            });
         }
         await tx.election.upsert({
            where: { id: electionId },
            create: {
               id: electionId,
               slug,
               title: '[DEMO] HIMTI Election',
               description:
                  'Local test election with synthetic votes. Close and publish it through admin.',
               createdBy: creator.id,
               originalEndsAt: window.endsAt,
               ...window,
            },
            update: { ...window, updatedBy: creator.id },
         });
         const candidates = [];
         for (let number = 1; number <= 3; number++) {
            const candidate = await tx.electionCandidate.upsert({
               where: { id: `demo-election-candidate-${number}` },
               create: {
                  id: `demo-election-candidate-${number}`,
                  electionId,
                  ballotNumber: number,
                  position: number - 1,
                  name: `Demo Candidate ${number}`,
                  biography: `Candidate ${number} is a fictional HIMTI member for local election testing.`,
                  slogan: [
                     'Grow together',
                     'Connect and collaborate',
                     'Build with purpose',
                  ][number - 1],
                  vision:
                     'An inclusive HIMTI community where every member can learn and contribute.',
                  mission:
                     'Connect members through practical learning, mentoring, and community projects.',
                  workPrograms: [
                     'Peer mentoring sessions',
                     'Hands-on technical workshops',
                     'Community project showcase',
                  ],
                  experiences: [
                     'HIMTI workshop committee',
                     'Student project team',
                  ],
                  photoUrl: null,
                  videoUrl: null,
                  isActive: true,
               },
               // Keep candidate profiles and photo URLs managed through admin on playback.
               update: { isActive: true },
            });
            if (
               candidate.electionId !== electionId ||
               candidate.ballotNumber !== number
            ) {
               throw new Error(
                  'Demo candidate identity collision; refusing to change it.',
               );
            }
            candidates.push(candidate);
         }
         const voters = [];
         for (let number = 1; number <= 40; number++) {
            const id = `demo-election-voter-${number}`;
            const email = `${id}@example.invalid`;
            const outlookEmail = `${id}@binus.ac.id`;
            const voter = await tx.user.upsert({
               where: { id },
               update: {},
               create: {
                  id,
                  email,
                  name: `Demo Voter ${number}`,
                  emailVerified: true,
                  outlookEmail,
                  outlookEmailVerified: true,
                  registrationCompletedAt: new Date(now - day),
                  status: 'ACTIVE',
                  institutionType: 'BINUS',
                  memberType: 'STUDENT',
                  studyProgramId: program.id,
               },
            });
            if (voter.email !== email || voter.outlookEmail !== outlookEmail) {
               throw new Error(
                  'Demo voter identity collision; refusing to change it.',
               );
            }
            voters.push(voter);
         }
         await tx.electionParticipation.createMany({
            data: voters.slice(0, 30).map((voter, index) => ({
               electionId,
               userId: voter.id,
               receiptCode: `DEMO-ELECTION-${index + 1}`,
               votedAt: new Date(now - (60 - index) * 60_000),
            })),
         });
         await tx.electionBallot.createMany({
            data: candidates.flatMap((candidate, index) =>
               Array.from({ length: [15, 10, 5][index] }, () => ({
                  electionId,
                  candidateId: candidate.id,
               })),
            ),
         });
         return reset ? 'reset' : 'created';
      },
      {
         isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
         timeout: 30_000,
      },
   );
}

if (
   process.argv[1] &&
   import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
   let prisma;
   try {
      const { values } = parseArgs({
         options: { reset: { type: 'boolean', default: false } },
      });
      if (!['development', 'test'].includes(process.env.NODE_ENV)) {
         throw new Error(
            'Election demo seed runs only in development or test.',
         );
      }
      const url = new URL(process.env.DATABASE_URL ?? '');
      if (
         !['postgres:', 'postgresql:'].includes(url.protocol) ||
         !['localhost', '127.0.0.1', '[::1]', 'db'].includes(url.hostname)
      ) {
         throw new Error(
            'Election demo seed requires a local database (localhost or Compose db).',
         );
      }
      prisma = new PrismaClient();
      const result = await seedElection(prisma, { reset: values.reset });
      console.log(
         `Demo election ${result}. ${result === 'unchanged' ? 'Use --reset to replay; this clears all demo votes.' : 'OPEN: 30 votes (15/10/5), 40 synthetic voters. Close and publish through admin.'}`,
      );
   } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
   } finally {
      await prisma?.$disconnect();
   }
}
