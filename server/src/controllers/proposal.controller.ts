import type { NextFunction, Request, Response } from 'express';
import * as proposalService from '../services/proposal.service';
import { parseUuidOr404 } from '../utils/uuid';

function userId(req: Request): string {
  if (!req.user) throw new Error('requireAuth did not set req.user');
  return req.user.id;
}

function leadId(req: Request): string {
  const raw = req.params.id;
  return parseUuidOr404(typeof raw === 'string' ? raw : '', 'Lead not found');
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const proposals = await proposalService.listProposals(userId(req), leadId(req));
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
}

export async function save(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const proposal = await proposalService.saveProposal(
      userId(req),
      leadId(req),
      req.body,
    );
    res.status(201).json({ proposal });
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = req.params.proposalId;
    const proposalId = parseUuidOr404(
      typeof raw === 'string' ? raw : '',
      'Proposal not found',
    );
    await proposalService.deleteProposal(userId(req), leadId(req), proposalId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
