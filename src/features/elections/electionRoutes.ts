import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   castVote,
   closeElection,
   createElection,
   createElectionCandidate,
   getCurrentElection,
   getElection,
   getElectionCandidates,
   getElectionEligibility,
   getElectionTally,
   getElectionTurnout,
   getMyVoteStatus,
   getPublishedElectionResults,
   listElections,
   openElection,
   publishElection,
   updateElection,
   updateElectionPublicDetails,
   updateDebateSchedule,
   updateElectionCandidate,
} from './electionController.js';

export const electionRouter: Router = express.Router();
export const internalElectionRouter: Router = express.Router();

electionRouter.get('/current', getCurrentElection);
electionRouter.get('/:electionId/candidates', getElectionCandidates);
electionRouter.get('/:electionId/results', getPublishedElectionResults);
electionRouter.get(
   '/:electionId/eligibility',
   requireAuth,
   getElectionEligibility,
);
electionRouter.get('/:electionId/my-vote-status', requireAuth, getMyVoteStatus);
electionRouter.post('/:electionId/vote', requireAuth, castVote);

internalElectionRouter.get(
   '/',
   requireAuth,
   requirePermission('manage_elections'),
   listElections,
);
internalElectionRouter.post(
   '/',
   requireAuth,
   requirePermission('manage_elections'),
   createElection,
);
internalElectionRouter.get(
   '/:electionId',
   requireAuth,
   requirePermission('manage_elections'),
   getElection,
);
internalElectionRouter.put(
   '/:electionId',
   requireAuth,
   requirePermission('manage_elections'),
   updateElection,
);
internalElectionRouter.patch(
   '/:electionId/debate-schedule',
   requireAuth,
   requirePermission('manage_elections'),
   updateDebateSchedule,
);
internalElectionRouter.patch(
   '/:electionId/public-details',
   requireAuth,
   requirePermission('manage_elections'),
   updateElectionPublicDetails,
);
internalElectionRouter.post(
   '/:electionId/candidates',
   requireAuth,
   requirePermission('manage_elections'),
   createElectionCandidate,
);
internalElectionRouter.put(
   '/candidates/:candidateId',
   requireAuth,
   requirePermission('manage_elections'),
   updateElectionCandidate,
);
internalElectionRouter.post(
   '/:electionId/open',
   requireAuth,
   requirePermission('manage_elections'),
   openElection,
);
internalElectionRouter.post(
   '/:electionId/close',
   requireAuth,
   requirePermission('manage_elections'),
   closeElection,
);
internalElectionRouter.get(
   '/:electionId/turnout',
   requireAuth,
   requirePermission('manage_elections'),
   getElectionTurnout,
);
internalElectionRouter.get(
   '/:electionId/tally',
   requireAuth,
   requirePermission('view_election_results'),
   getElectionTally,
);
internalElectionRouter.post(
   '/:electionId/publish',
   requireAuth,
   requirePermission('manage_elections'),
   publishElection,
);
