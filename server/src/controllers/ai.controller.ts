import type { NextFunction, Request, Response } from 'express';
import * as aiService from '../services/ai/ai.service';
import { detectPromptInjection } from '../services/ai/injection';
import type { AiProvider } from '../services/ai/provider';
import * as followUpService from '../services/follow-up.service';
import * as proposalService from '../services/proposal.service';

function userId(req: Request): string {
  if (!req.user) throw new Error('requireAuth did not set req.user');
  return req.user.id;
}

export function createAiController(ai: AiProvider) {
  return {
    async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const conversation: string = req.body.conversation;
        const injectionWarning = detectPromptInjection(conversation);
        const lead = await aiService.analyzeConversation(ai, conversation);
        res.json(injectionWarning ? { lead, warning: injectionWarning } : { lead });
      } catch (err) {
        next(err);
      }
    },

    async followUp(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const message = await followUpService.generateFollowUp(
          ai,
          userId(req),
          req.body.leadId,
        );
        res.json({ message });
      } catch (err) {
        next(err);
      }
    },

    async proposal(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { leadId, requirements } = req.body as {
          leadId: string;
          requirements?: string;
        };
        const proposal = await proposalService.generateProposal(
          ai,
          userId(req),
          leadId,
          requirements,
        );
        res.json({ proposal });
      } catch (err) {
        next(err);
      }
    },
  };
}
