import '@/docs/zodOpenApi.js';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
   errorResponseSchema,
   protectedEndpoint,
   validationErrorResponseSchema,
} from '@/docs/commonSchemas.js';
import {
   CastVoteSchema,
   CreateCandidateSchema,
   CreateElectionSchema,
   UpdateCandidateSchema,
   UpdateDebateScheduleSchema,
   UpdateElectionSchema,
   UpdateElectionPublicDetailsSchema,
} from './electionSchema.js';

const tag = 'Elections';
const electionStatusSchema = z.enum(['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED']);
const params = z.object({ electionId: z.string() });
const candidateParams = z.object({ candidateId: z.string() });

const candidateSchema = z.object({
   id: z.string(),
   electionId: z.string(),
   ballotNumber: z.number(),
   name: z.string(),
   photoUrl: z.string().nullable(),
   biography: z.string().nullable(),
   slogan: z.string().nullable(),
   vision: z.string(),
   mission: z.string(),
   videoUrl: z.string().nullable(),
   workPrograms: z.array(z.string()),
   experiences: z.array(z.string()),
   position: z.number(),
   isActive: z.boolean(),
});

const electionSchema = z.object({
   id: z.string(),
   slug: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   status: electionStatusSchema,
   startsAt: z.string().datetime(),
   endsAt: z.string().datetime(),
   debateAt: z.string().datetime().nullable(),
   openedAt: z.string().datetime().nullable(),
   closedAt: z.string().datetime().nullable(),
   publishedAt: z.string().datetime().nullable(),
   createdAt: z.string().datetime(),
   updatedAt: z.string().datetime().nullable(),
   candidates: z.array(candidateSchema),
});

const response = (data: z.ZodType) =>
   z.object({ msg: z.literal('success'), data });
const content = (schema: z.ZodType) => ({
   'application/json': { schema },
});
const standardErrors = {
   400: {
      description: 'Validation error.',
      content: content(validationErrorResponseSchema),
   },
   401: { description: 'Authentication required.' },
   403: {
      description: 'Not eligible or missing permission.',
      content: content(errorResponseSchema),
   },
   404: {
      description: 'Election or candidate not found.',
      content: content(errorResponseSchema),
   },
   409: {
      description: 'Election state or duplicate-vote conflict.',
      content: content(errorResponseSchema),
   },
};

export const registerElectionDocs = (registry: OpenAPIRegistry) => {
   const ElectionResponse = registry.register(
      'ElectionResponse',
      response(electionSchema),
   );
   const CandidateListResponse = registry.register(
      'ElectionCandidateListResponse',
      response(z.array(candidateSchema)),
   );
   const EligibilityResponse = registry.register(
      'ElectionEligibilityResponse',
      response(
         z.object({
            eligible: z.boolean(),
            reason: z
               .enum([
                  'ACCOUNT_INACTIVE',
                  'PROFILE_INCOMPLETE',
                  'OUTLOOK_NOT_VERIFIED',
                  'OUTLOOK_DOMAIN_NOT_ALLOWED',
                  'NOT_COMPUTER_SCIENCE',
                  'ELECTION_NOT_OPEN',
                  'ALREADY_VOTED',
               ])
               .nullable(),
            hasVoted: z.boolean(),
         }),
      ),
   );
   const VoteStatusResponse = registry.register(
      'ElectionVoteStatusResponse',
      response(
         z.object({
            hasVoted: z.boolean(),
            receiptCode: z.string().nullable(),
            votedAt: z.string().datetime().nullable(),
         }),
      ),
   );
   const VoteResponse = registry.register(
      'ElectionVoteResponse',
      response(
         z.object({
            receiptCode: z.string(),
            votedAt: z.string().datetime(),
         }),
      ),
   );
   const TallyResponse = registry.register(
      'ElectionTallyResponse',
      response(
         z.object({
            participationCount: z.number(),
            ballotCount: z.number(),
            valid: z.boolean(),
            winnerCandidateId: z.string().nullable(),
            isTie: z.boolean(),
            results: z.array(
               z.object({ candidate: candidateSchema, votes: z.number() }),
            ),
         }),
      ),
   );

   registry.registerPath({
      method: 'get',
      path: '/api/v1/elections/current',
      tags: [tag],
      summary: 'Get the current election',
      responses: {
         200: {
            description: 'Current election or null.',
            content: content(response(electionSchema.nullable())),
         },
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/elections/{electionId}/candidates',
      tags: [tag],
      summary: 'List public election candidates',
      request: { params },
      responses: {
         200: {
            description: 'Candidates returned.',
            content: content(CandidateListResponse),
         },
         ...standardErrors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/elections/{electionId}/eligibility',
      tags: [tag],
      summary: 'Check current voter eligibility',
      security: [protectedEndpoint],
      request: { params },
      responses: {
         200: {
            description: 'Eligibility returned.',
            content: content(EligibilityResponse),
         },
         ...standardErrors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/elections/{electionId}/my-vote-status',
      tags: [tag],
      summary: 'Get current voter ballot status',
      security: [protectedEndpoint],
      request: { params },
      responses: {
         200: {
            description: 'Status returned without candidate choice.',
            content: content(VoteStatusResponse),
         },
         ...standardErrors,
      },
   });
   registry.registerPath({
      method: 'post',
      path: '/api/v1/elections/{electionId}/vote',
      tags: [tag],
      summary: 'Cast one final anonymous ballot',
      security: [protectedEndpoint],
      request: {
         params,
         body: { required: true, content: content(CastVoteSchema) },
      },
      responses: {
         201: {
            description:
               'Vote accepted. The receipt does not identify the candidate.',
            content: content(VoteResponse),
         },
         ...standardErrors,
      },
   });
   registry.registerPath({
      method: 'get',
      path: '/api/v1/elections/{electionId}/results',
      tags: [tag],
      summary: 'Get published results',
      request: { params },
      responses: {
         200: {
            description: 'Published results returned.',
            content: content(TallyResponse),
         },
         ...standardErrors,
      },
   });

   const internalPaths = [
      {
         method: 'get' as const,
         path: '/api/v1/internal/elections',
         summary: 'List elections',
         responseSchema: response(z.array(electionSchema)),
      },
      {
         method: 'patch' as const,
         path: '/api/v1/internal/elections/{electionId}/debate-schedule',
         summary: 'Update a draft or open election debate schedule',
         body: UpdateDebateScheduleSchema,
         responseSchema: ElectionResponse,
      },
      {
         method: 'patch' as const,
         path: '/api/v1/internal/elections/{electionId}/public-details',
         summary: 'Update draft or open election public details',
         body: UpdateElectionPublicDetailsSchema,
         responseSchema: ElectionResponse,
      },
      {
         method: 'post' as const,
         path: '/api/v1/internal/elections',
         summary: 'Create an election',
         body: CreateElectionSchema,
         responseSchema: ElectionResponse,
      },
      {
         method: 'get' as const,
         path: '/api/v1/internal/elections/{electionId}',
         summary: 'Get an election',
         responseSchema: ElectionResponse,
      },
      {
         method: 'put' as const,
         path: '/api/v1/internal/elections/{electionId}',
         summary: 'Update a draft election',
         body: UpdateElectionSchema,
         responseSchema: ElectionResponse,
      },
      {
         method: 'post' as const,
         path: '/api/v1/internal/elections/{electionId}/candidates',
         summary: 'Create a draft candidate',
         body: CreateCandidateSchema,
         responseSchema: response(candidateSchema),
      },
      {
         method: 'put' as const,
         path: '/api/v1/internal/elections/candidates/{candidateId}',
         summary: 'Update a draft candidate',
         body: UpdateCandidateSchema,
         responseSchema: response(candidateSchema),
         candidate: true,
      },
      {
         method: 'post' as const,
         path: '/api/v1/internal/elections/{electionId}/open',
         summary: 'Open an election',
         responseSchema: ElectionResponse,
      },
      {
         method: 'post' as const,
         path: '/api/v1/internal/elections/{electionId}/close',
         summary: 'Close an election',
         responseSchema: ElectionResponse,
      },
      {
         method: 'get' as const,
         path: '/api/v1/internal/elections/{electionId}/turnout',
         summary: 'Get aggregate turnout',
         responseSchema: response(
            z.object({
               participationCount: z.number(),
               ballotCount: z.number(),
               valid: z.boolean(),
            }),
         ),
      },
      {
         method: 'get' as const,
         path: '/api/v1/internal/elections/{electionId}/tally',
         summary: 'Get a closed-election tally',
         responseSchema: TallyResponse,
      },
      {
         method: 'post' as const,
         path: '/api/v1/internal/elections/{electionId}/publish',
         summary: 'Publish verified results',
         responseSchema: ElectionResponse,
      },
   ];

   for (const path of internalPaths) {
      registry.registerPath({
         method: path.method,
         path: path.path,
         tags: [tag],
         summary: path.summary,
         security: [protectedEndpoint],
         request: {
            ...(path.path.includes('{') && {
               params: path.candidate ? candidateParams : params,
            }),
            ...(path.body && {
               body: { required: true, content: content(path.body) },
            }),
         },
         responses: {
            [path.method === 'post' &&
            !path.path.endsWith('/open') &&
            !path.path.endsWith('/close') &&
            !path.path.endsWith('/publish')
               ? 201
               : 200]: {
               description: 'Operation completed.',
               content: content(path.responseSchema),
            },
            ...standardErrors,
         },
      });
   }
};
