import { api } from './client';
import type { User } from '../types';

export interface MeResponse {
  user: User;
}

export interface AuthResponse {
  user: User;
}

export function fetchMe(): Promise<MeResponse> {
  return api<MeResponse>('/auth/me');
}

export function login(body: { email: string; password: string }): Promise<AuthResponse> {
  return api<AuthResponse>('/auth/login', { method: 'POST', body });
}

export function register(body: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return api<AuthResponse>('/auth/register', { method: 'POST', body });
}

export function logout(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}
