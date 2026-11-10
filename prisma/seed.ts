import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
   console.log('🌱 Memulai proses database seeding...');

   // ==========================================
   // SEED UNIVERSITY
   // ==========================================
   console.log('⏳ Seeding University...');
   await prisma.university.upsert({
      where: { name: 'BINUS University' },
      update: {},
      create: {
         name: 'BINUS University',
         shortName: 'BINUS',
      },
   });

   // ==========================================
   // SEED STUDY PROGRAMS
   // ==========================================
   console.log('⏳ Seeding Study Programs...');
   const studyPrograms = [
      { name: 'Artificial Intelligence', shortName: 'AI' },
      { name: 'Computer Science - Global Class', shortName: 'CS Global' },
      { name: 'Computer Science - Regular Class', shortName: 'CS Regular' },
      { name: 'Computer Science - Master Track', shortName: 'CS Master' },
      {
         name: 'Computer Science - Software Engineering',
         shortName: 'CS Software Engineering',
      },
      { name: 'Cyber Security', shortName: 'Cyber Security' },
      { name: 'Data Science', shortName: 'Data Science' },
      { name: 'Digital Psychology', shortName: 'Digital Psychology' },
      {
         name: 'Game Application and Technology',
         shortName: 'GAT',
      },
   ];
   for (const sp of studyPrograms) {
      await prisma.studyProgram.upsert({
         where: { name: sp.name },
         update: {},
         create: { name: sp.name, shortName: sp.shortName },
      });
   }

   // ==========================================
   // SEED REGIONS
   // ==========================================
   console.log('⏳ Seeding Regions...');
   const regions = [
      ['alam-sutera', 'Alam Sutera'],
      ['bandung', 'Bandung'],
      ['bekasi', 'Bekasi'],
      ['kemanggisan', 'Kemanggisan'],
      ['malang', 'Malang'],
      ['medan', 'Medan'],
      ['senayan', 'Senayan'],
      ['semarang', 'Semarang'],
   ] as const;
   for (const [id, name] of regions) {
      await prisma.region.upsert({
         where: { name },
         update: {},
         create: { id, name },
      });
   }

   // ==========================================
   // SEED SYSTEM USER (for createdBy references)
   // ==========================================
   console.log('⏳ Seeding System User...');
   const systemUser = await prisma.user.upsert({
      where: { email: 'system@himti.internal' },
      update: {
         status: 'ACTIVE',
         registrationCompletedAt: new Date(),
         institutionType: 'NON_BINUS',
      },
      create: {
         name: 'System',
         email: 'system@himti.internal',
         emailVerified: true,
         status: 'ACTIVE',
         registrationCompletedAt: new Date(),
         institutionType: 'NON_BINUS',
      },
   });

   // ==========================================
   // SEED PERMISSIONS
   // ==========================================
   console.log('⏳ Seeding Permissions...');
   const permissionNames = [
      'manage_urls',
      'manage_permissions',
      'manage_users',
      'manage_roles',
      'manage_events',
      'manage_event_groups',
      'manage_event_registration',
      'manage_event_packages',
      'manage_event_registration_form',
      'manage_batch',
      'review_event_registrations',
      'view_event_answers',
      'review_event_payments',
      'view_payment_proofs',
      'scan_event_tickets',
      'view_event_attendance',
      'correct_event_attendance',
      'manage_elections',
      'manage_certificates',
      'manage_education',
   ];

   const permissions: Record<string, { id: string }> = {};
   for (const name of permissionNames) {
      const perm = await prisma.permission.upsert({
         where: { name },
         update: {},
         create: {
            name,
            creator: { connect: { id: systemUser.id } },
         },
      });
      permissions[name] = perm;
   }

   // ==========================================
   // SEED ROLES & ASSIGN PERMISSIONS
   // ==========================================
   console.log('⏳ Seeding Roles and Assigning Permissions...');
   // Administrators attest SoCS membership; these roles grant no management permissions.
   for (const roleName of ['SoCS Student', 'SoCS Lecturer']) {
      await prisma.role.upsert({
         where: { roleName }, update: {},
         create: { roleName, creator: { connect: { id: systemUser.id } } },
      });
   }
   const roleNames = ['General Manager', 'Manager', 'DPI Umum', 'DPI', 'Admin'];

   for (const roleName of roleNames) {
      const role = await prisma.role.upsert({
         where: { roleName },
         update: {},
         create: {
            roleName,
            creator: { connect: { id: systemUser.id } },
         },
      });

      // Batch and election administration are restricted to administrators.
      for (const perm of Object.values(permissions)) {
         if (
            [
               permissions.manage_batch.id,
               permissions.review_event_registrations.id,
               permissions.view_event_answers.id,
               permissions.review_event_payments.id,
               permissions.view_payment_proofs.id,
               permissions.scan_event_tickets.id,
               permissions.view_event_attendance.id,
               permissions.correct_event_attendance.id,
               permissions.manage_elections.id,
            ].includes(perm.id) &&
            roleName !== 'Admin'
         ) {
            continue;
         }
         await prisma.roleHasPermission.upsert({
            where: {
               roleId_permissionId: {
                  roleId: role.id,
                  permissionId: perm.id,
               },
            },
            update: {},
            create: {
               roleId: role.id,
               permissionId: perm.id,
            },
         });
      }
   }

   const adminRole = await prisma.role.findUniqueOrThrow({
      where: { roleName: 'Admin' },
   });
   if (adminRole.status !== 'ACTIVE') {
      await prisma.role.update({
         where: { id: adminRole.id },
         data: { status: 'ACTIVE' },
      });
   }
   await prisma.userHasRole.upsert({
      where: { userId_roleId: { userId: systemUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: systemUser.id, roleId: adminRole.id },
   });

   // ==========================================
   // SEED MEMBERSHIP PERIOD
   // ==========================================
   console.log('⏳ Seeding Membership Period...');
   await prisma.$transaction(async (tx) => {
      const activePeriod = await tx.membershipPeriod.findFirst({
         where: { isActive: true },
      });
      await tx.membershipPeriod.upsert({
         where: { id: '2026-2027' },
         update: {},
         create: {
            id: '2026-2027',
            label: '2026/2027',
            isActive: !activePeriod,
         },
      });
   });

   // ==========================================
   // SEED COURSES (EDUCATION - BINUS CS SYLLABUS)
   // ==========================================
   console.log('Seeding Courses from Binus CS Syllabus...');
   const courses = [
      {
         name: 'Algorithm & Programming',
         code: 'COMP6047001',
         description: 'Fundamental concepts of algorithm design, flowcharting, pseudocode, and procedural programming in C/C++, covering variables, control structures, functions, pointers, arrays, and file handling.',
      },
      {
         name: 'Program Design Methods',
         code: 'COMP6048001',
         description: 'Structured programming methodologies, modular program design, algorithm efficiency, defensive coding, testing, and problem decomposition techniques.',
      },
      {
         name: 'Calculus',
         code: 'MATH6021001',
         description: 'Differential and integral calculus, limits, continuity, derivatives, optimization problems, and integration techniques with applications in computational science.',
      },
      {
         name: 'Discrete Mathematics',
         code: 'MATH6025001',
         description: 'Set theory, mathematical logic, relations and functions, combinatorics, graph theory, Boolean algebra, and tree structures essential for computing.',
      },
      {
         name: 'Linear Algebra',
         code: 'MATH6030001',
         description: 'Systems of linear equations, matrices, determinants, vector spaces, eigenvalues, eigenvectors, and linear transformations applied to computer graphics and data analysis.',
      },
      {
         name: 'Data Structures',
         code: 'COMP6056001',
         description: 'Abstract data types, dynamic memory allocation, linked lists, stacks, queues, trees, binary search trees, heaps, hash tables, and graph representations with complexity analysis.',
      },
      {
         name: 'Object Oriented Programming',
         code: 'COMP6049001',
         description: 'Object-oriented paradigm using Java, encapsulation, inheritance, polymorphism, abstract classes, interfaces, exception handling, design patterns, and GUI programming.',
      },
      {
         name: 'Computer Architecture',
         code: 'COMP6051001',
         description: 'Von Neumann architecture, instruction set architecture (ISA), processor datapath and control unit, memory hierarchy and cache, pipelining, and I/O subsystems.',
      },
      {
         name: 'Database Systems',
         code: 'COMP6079001',
         description: 'Relational database concepts, entity-relationship modeling, relational algebra, SQL querying and DDL/DML, normalization up to BCNF, indexing, and transaction management.',
      },
      {
         name: 'Operating Systems',
         code: 'COMP6065001',
         description: 'Operating system concepts, process and thread management, CPU scheduling, synchronization primitives (mutex, semaphores), deadlock handling, virtual memory, and file systems.',
      },
      {
         name: 'Computer Networks',
         code: 'COMP6082001',
         description: 'OSI and TCP/IP network architectures, physical and data link protocols, IP addressing and subnetting, routing protocols, transport protocols (TCP/UDP), and socket programming.',
      },
      {
         name: 'Design and Analysis of Algorithms',
         code: 'COMP6106001',
         description: 'Advanced algorithm design paradigms including divide-and-conquer, greedy algorithms, dynamic programming, network flow, and computational complexity (P vs NP).',
      },
      {
         name: 'Software Engineering',
         code: 'COMP6098001',
         description: 'Software lifecycle models, Agile/Scrum methodologies, requirements engineering, UML modeling, architectural patterns, software testing, and quality assurance.',
      },
      {
         name: 'Web Programming',
         code: 'COMP6100001',
         description: 'Modern web application development covering full-stack architecture, frontend frameworks, RESTful API design, server-side development, authentication, and web security.',
      },
      {
         name: 'Artificial Intelligence',
         code: 'COMP6099001',
         description: 'Search algorithms, heuristic search, knowledge representation, expert systems, probabilistic reasoning, introduction to machine learning, and neural networks.',
      },
      {
         name: 'Human and Computer Interaction',
         code: 'COMP6101001',
         description: 'User-centered design principles, usability heuristics, user research, wireframing, interactive prototyping, and usability evaluation of digital interfaces.',
      },
   ];
   for (const course of courses) {
      await prisma.course.upsert({
         where: { name: course.name },
         update: { code: course.code, description: course.description },
         create: course,
      });
   }

   
   // ==========================================
   // SEED RESPONSI (EDUCATION)
   // ==========================================
   console.log('Seeding Responsi summaries...');
   const responsiList = [
      {
         id: 'dynamic-programming',
         title: 'Dynamic Programming',
         courseName: 'Algorithm & Programming',
         academicPeriod: '2026/2027',
         examType: 'Mid Exam',
         pic: 'Joshua Alexander Larido',
         status: 'PUBLISHED' as const,
         content: '# Dynamic Programming\n\n## Ringkasan\nResponsi ini merangkum materi Dynamic Programming untuk Mid Exam 2026/2027.\n\n## Poin Utama\n1. Optimal substructure dan overlapping subproblems.\n2. Memoization (top-down) vs Tabulation (bottom-up).\n3. Contoh kasus: Knapsack, LCS, LIS.',
      },
      {
         id: 'limits-and-continuity',
         title: 'Limits and Continuity',
         courseName: 'Calculus',
         academicPeriod: '2026/2027',
         examType: 'Mid Exam',
         pic: 'Abyan Ikram Muhammad',
         status: 'PUBLISHED' as const,
         content: '# Limits and Continuity\n\n## Ringkasan\nMateri Kalkulus kalkulasi limit fungsi dan kekontinuan untuk Mid Exam 2026/2027.',
      },
      {
         id: 'database-normalization',
         title: 'Database Normalization',
         courseName: 'Database Systems',
         academicPeriod: '2026/2027',
         examType: 'Mid Exam',
         pic: 'Abyan Ikram Muhammad',
         status: 'PUBLISHED' as const,
         content: '# Database Normalization\n\n## Ringkasan\nKonsep bentuk normal 1NF, 2NF, 3NF, dan BCNF pada perancangan basis data relasional.',
      },
      {
         id: 'computer-architecture-basics',
         title: 'Computer Architecture Basics',
         courseName: 'Computer Architecture',
         academicPeriod: '2026/2027',
         examType: 'Mid Exam',
         pic: 'Joshua Alexander Larido',
         status: 'UNDER_REVIEW' as const,
         content: '# Computer Architecture Basics\n\n## Ringkasan\nArsitektur von Neumann, instruksi ISA, pipelining, dan hierarki memori.',
      },
      {
         id: 'graph-algorithms',
         title: 'Graph Algorithms',
         courseName: 'Algorithm & Programming',
         academicPeriod: '2026/2027',
         examType: 'Final Exam',
         pic: 'Rachel Vanesssa',
         status: 'DRAFT' as const,
         content: '# Graph Algorithms\n\n## Ringkasan\nTraversal BFS/DFS, shortest path Dijkstra/Bellman-Ford, dan Minimum Spanning Tree Prim/Kruskal.',
      },
      {
         id: 'operating-systems',
         title: 'Operating Systems',
         courseName: 'Operating Systems',
         academicPeriod: '2026/2027',
         examType: 'Mid Exam',
         pic: 'Abyan Ikram Muhammad',
         status: 'DRAFT' as const,
         content: '# Operating Systems\n\n## Ringkasan\nManajemen proses, threads, CPU scheduling algorithms, dan konkurensi (semaphores, mutex).',
      },
      {
         id: 'network-fundamentals',
         title: 'Network Fundamentals',
         courseName: 'Computer Networks',
         academicPeriod: '2026/2027',
         examType: 'Final Exam',
         pic: 'Christopher Sebastian',
         status: 'ARCHIVED' as const,
         content: '# Network Fundamentals\n\n## Ringkasan\nModel OSI 7-layer, TCP/IP stack, IP addressing & subnetting, routing protocols.',
      },
   ];

   for (const item of responsiList) {
      const course = await prisma.course.findUnique({
         where: { name: item.courseName },
      });
      if (!course) continue;

      const responsi = await prisma.responsi.upsert({
         where: { id: item.id },
         update: {
            title: item.title,
            courseId: course.id,
            academicPeriod: item.academicPeriod,
            examType: item.examType,
            pic: item.pic,
            status: item.status,
            content: item.content,
         },
         create: {
            id: item.id,
            title: item.title,
            courseId: course.id,
            academicPeriod: item.academicPeriod,
            examType: item.examType,
            pic: item.pic,
            status: item.status,
            content: item.content,
         },
      });

      if (item.status === 'PUBLISHED') {
         await prisma.responsiVersion.upsert({
            where: { id: `${item.id}-v1` },
            update: {},
            create: {
               id: `${item.id}-v1`,
               responsiId: responsi.id,
               version: 'v1',
               content: item.content,
               status: 'PUBLISHED',
               createdBy: item.pic,
            },
         });
      }
   }

   console.log('✅ Seeding berhasil diselesaikan!');
}

main()
   .catch((e) => {
      console.error('❌ Terjadi kesalahan saat seeding:', e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
