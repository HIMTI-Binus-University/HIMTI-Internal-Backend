import { Request, Response } from 'express';
import { electionService } from './electionService.js';
import {
   CandidateIdSchema,
   CastVoteSchema,
   CreateCandidateSchema,
   CreateElectionSchema,
   ElectionIdSchema,
   EmptyElectionBodySchema,
   UpdateCandidateSchema,
   UpdateDebateScheduleSchema,
   UpdateElectionSchema,
   UpdateElectionPublicDetailsSchema,
} from './electionSchema.js';

const success = (res: Response, data: unknown, status = 200) =>
   res.status(status).json({ msg: 'success', data });

export const getCurrentElection = async (_req: Request, res: Response) =>
   success(res, await electionService.getCurrent());

export const getElectionCandidates = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(res, await electionService.getCandidates(electionId));
};

export const getElectionEligibility = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(
      res,
      await electionService.getEligibility(electionId, res.locals.user.id),
   );
};

export const getMyVoteStatus = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(
      res,
      await electionService.getVoteStatus(electionId, res.locals.user.id),
   );
};

export const castVote = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   const body = CastVoteSchema.parse(req.body);
   return success(
      res,
      await electionService.castVote(electionId, body, res.locals.user.id),
      201,
   );
};

export const getPublishedElectionResults = async (
   req: Request,
   res: Response,
) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(res, await electionService.getPublishedResults(electionId));
};

export const listElections = async (_req: Request, res: Response) =>
   success(res, await electionService.list());

export const getElection = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(res, await electionService.get(electionId));
};

export const createElection = async (req: Request, res: Response) => {
   const body = CreateElectionSchema.parse(req.body);
   return success(
      res,
      await electionService.create(body, res.locals.user.id),
      201,
   );
};

export const updateElection = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   const body = UpdateElectionSchema.parse(req.body);
   return success(
      res,
      await electionService.update(electionId, body, res.locals.user.id),
   );
};

export const updateDebateSchedule = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   const body = UpdateDebateScheduleSchema.parse(req.body);
   return success(
      res,
      await electionService.updateDebateSchedule(
         electionId,
         body,
         res.locals.user.id,
      ),
   );
};

export const updateElectionPublicDetails = async (
   req: Request,
   res: Response,
) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   const body = UpdateElectionPublicDetailsSchema.parse(req.body);
   return success(
      res,
      await electionService.updatePublicDetails(
         electionId,
         body,
         res.locals.user.id,
      ),
   );
};

export const createElectionCandidate = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   const body = CreateCandidateSchema.parse(req.body);
   return success(
      res,
      await electionService.createCandidate(electionId, body),
      201,
   );
};

export const updateElectionCandidate = async (req: Request, res: Response) => {
   const { candidateId } = CandidateIdSchema.parse(req.params);
   const body = UpdateCandidateSchema.parse(req.body);
   return success(
      res,
      await electionService.updateCandidate(candidateId, body),
   );
};

export const openElection = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   EmptyElectionBodySchema.parse(req.body ?? {});
   return success(
      res,
      await electionService.open(electionId, res.locals.user.id),
   );
};

export const closeElection = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   EmptyElectionBodySchema.parse(req.body ?? {});
   return success(
      res,
      await electionService.close(electionId, res.locals.user.id),
   );
};

export const getElectionTurnout = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(res, await electionService.getTurnout(electionId));
};

export const getElectionTally = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   return success(res, await electionService.getTally(electionId));
};

export const publishElection = async (req: Request, res: Response) => {
   const { electionId } = ElectionIdSchema.parse(req.params);
   EmptyElectionBodySchema.parse(req.body ?? {});
   return success(
      res,
      await electionService.publish(electionId, res.locals.user.id),
   );
};
