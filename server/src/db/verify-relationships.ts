import path from 'path';
import { and, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client';
import { conversations, leads, messages, users } from './schema';

async function main(): Promise<void> {
  await pool.query(
    'DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;',
  );
  console.log('schema dropped');

  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, '../../drizzle'),
  });
  console.log('migrations applied from scratch');

  const [user] = await db
    .insert(users)
    .values({
      name: 'Test User',
      email: 'chain-test@example.com',
      passwordHash: 'x',
    })
    .returning();
  if (!user) throw new Error('user insert failed');

  const [lead] = await db
    .insert(leads)
    .values({ userId: user.id, clientName: 'Acme Co', project: 'Website' })
    .returning();
  if (!lead) throw new Error('lead insert failed');

  const [conv] = await db
    .insert(conversations)
    .values({ leadId: lead.id })
    .returning();
  if (!conv) throw new Error('conversation insert failed');

  const [msg] = await db
    .insert(messages)
    .values({ conversationId: conv.id, role: 'client', content: 'Hello' })
    .returning();
  if (!msg) throw new Error('message insert failed');
  console.log('inserted user → lead → conversation → message');

  const [joined] = await db
    .select({
      userName: users.name,
      clientName: leads.clientName,
      messageRole: messages.role,
      messageContent: messages.content,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(leads, eq(conversations.leadId, leads.id))
    .innerJoin(users, eq(leads.userId, users.id))
    .where(and(eq(users.id, user.id), eq(messages.id, msg.id)));

  if (
    !joined ||
    joined.userName !== 'Test User' ||
    joined.clientName !== 'Acme Co' ||
    joined.messageRole !== 'client' ||
    joined.messageContent !== 'Hello'
  ) {
    throw new Error(`chain join failed: ${JSON.stringify(joined)}`);
  }
  console.log('relation join OK:', JSON.stringify(joined));

  let fkRejected = false;
  try {
    await db
      .insert(leads)
      .values({ userId: '00000000-0000-0000-0000-000000000000', clientName: 'x' });
  } catch {
    fkRejected = true;
  }
  if (!fkRejected) throw new Error('FK violation was NOT rejected');
  console.log('FK enforcement OK (bad user_id rejected)');

  await db.delete(users).where(eq(users.id, user.id));
  const leftover = await db.select().from(leads).where(eq(leads.userId, user.id));
  if (leftover.length !== 0) throw new Error('cascade delete failed');
  console.log('cascade delete OK');

  await pool.end();
  console.log('ALL CHECKS PASSED');
}

main().catch((err) => {
  console.error('VERIFY FAILED:', err);
  process.exitCode = 1;
});
