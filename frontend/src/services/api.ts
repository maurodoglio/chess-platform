import type { UserInfo } from '../types';
import type { GameHistoryResponse, GameDetail } from '../types/game';

const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCurrentUser(): Promise<UserInfo | null> {
  try {
    return await fetchJson<UserInfo>(`${API_BASE}/user/me`);
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  sessionStorage.removeItem('auth_token');
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...getAuthHeaders() },
  });
}

export async function fetchGameHistory(page: number = 1, pageSize: number = 20): Promise<GameHistoryResponse> {
  return fetchJson<GameHistoryResponse>(`${API_BASE}/games?page=${page}&pageSize=${pageSize}`);
}

export async function fetchGame(id: string): Promise<GameDetail> {
  return fetchJson<GameDetail>(`${API_BASE}/games/${id}`);
}

export async function devLogin(displayName: string, providerId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/dev-login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName, providerId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.token) {
    sessionStorage.setItem('auth_token', data.token);
  }
}
