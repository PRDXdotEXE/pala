import { proposalSchema } from '../services/ai/schemas/proposal';

/** Saving a proposal accepts exactly the shape the generator produces (single source of truth). */
export const saveProposalSchema = proposalSchema;

export type SaveProposalInput = (typeof saveProposalSchema)['_output'];
