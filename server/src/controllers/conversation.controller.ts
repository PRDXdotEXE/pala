import type { NextFunction, Request, Response } from 'express';
import * as conversationService from '../services/conversation.service';
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
    const conversations = await conversationService.getConversations(
      userId(req),
      leadId(req),
    );
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

export async function add(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const message = await conversationService.addMessage(
      userId(req),
      leadId(req),
      req.body,
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}
