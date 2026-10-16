import type { NextFunction, Request, Response } from 'express';
import * as leadService from '../services/lead.service';
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
    const leads = await leadService.listLeads(userId(req));
    res.json({ leads });
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lead = await leadService.createLead(userId(req), req.body);
    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lead = await leadService.getLead(userId(req), leadId(req));
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const lead = await leadService.updateLead(userId(req), leadId(req), req.body);
    res.json({ lead });
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
    await leadService.deleteLead(userId(req), leadId(req));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
