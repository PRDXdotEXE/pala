import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { db } from '../db/client';
import { users } from '../db/schema';
import { HttpError } from '../utils/http-error';
import type { AuthUser } from '../middleware/auth';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = '7d';

export const safeUserFields = {
  id: users.id,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
};

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const direct = (err as { code?: unknown }).code;
  if (typeof direct === 'string') return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === 'object' && cause !== null) {
    const inner = (cause as { code?: unknown }).code;
    if (typeof inner === 'string') return inner;
  }
  return undefined;
}

function isUniqueViolation(err: unknown): boolean {
  return pgErrorCode(err) === '23505';
}

export async function register(input: RegisterInput): Promise<SafeUser> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
      })
      .returning(safeUserFields);
    if (!user) throw new HttpError(500, 'Registration failed');
    return user;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'Email already registered');
    }
    throw err;
  }
}

export async function login(input: LoginInput): Promise<SafeUser> {
  const email = input.email.toLowerCase();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export function createSessionToken(user: SafeUser | AuthUser): string {
  return jwt.sign(
    { email: user.email, name: user.name },
    env.JWT_SECRET,
    { subject: user.id, expiresIn: '7d' },
  );
}
