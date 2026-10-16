import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'contacted',
  'interested',
  'proposal_sent',
  'negotiating',
  'converted',
  'lost',
]);

export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);

export const messageRoleEnum = pgEnum('message_role', ['client', 'assistant', 'user']);

const id = uuid('id').defaultRandom().primaryKey();
const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp('updated_at', { withTimezone: true })
  .defaultNow()
  .notNull()
  .$onUpdate(() => new Date());

export const users = pgTable('users', {
  id,
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt,
  updatedAt,
});

export const leads = pgTable(
  'leads',
  {
    id,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clientName: text('client_name').notNull(),
    company: text('company'),
    project: text('project'),
    description: text('description'),
    budgetMin: integer('budget_min'),
    budgetMax: integer('budget_max'),
    currency: text('currency').notNull().default('USD'),
    status: leadStatusEnum('status').notNull().default('new'),
    priority: priorityEnum('priority').notNull().default('medium'),
    deadline: date('deadline'),
    nextFollowUp: timestamp('next_follow_up', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [index('leads_user_id_idx').on(table.userId)],
);

export const conversations = pgTable(
  'conversations',
  {
    id,
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    createdAt,
    updatedAt,
  },
  (table) => [index('conversations_lead_id_idx').on(table.leadId)],
);

export const messages = pgTable(
  'messages',
  {
    id,
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    createdAt,
  },
  (table) => [index('messages_conversation_id_idx').on(table.conversationId)],
);

export const proposals = pgTable(
  'proposals',
  {
    id,
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    projectOverview: text('project_overview').notNull(),
    scope: text('scope').array().notNull(),
    deliverables: text('deliverables').array().notNull(),
    timeline: text('timeline').array().notNull(),
    pricing: text('pricing').notNull(),
    nextSteps: text('next_steps').notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index('proposals_lead_id_idx').on(table.leadId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, {
    fields: [leads.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
  proposals: many(proposals),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  lead: one(leads, {
    fields: [conversations.leadId],
    references: [leads.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  lead: one(leads, {
    fields: [proposals.leadId],
    references: [leads.id],
  }),
}));
