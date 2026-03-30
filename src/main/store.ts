import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { SessionMeta } from '../shared/types';

const STORE_DIR = join(homedir(), '.claude-overlay');
const STORE_FILE = join(STORE_DIR, 'sessions.json');

// Key is sessionId (from Claude) or cwd as fallback
type SessionStore = Record<string, SessionMeta>;

let cache: SessionStore | null = null;

function load(): SessionStore {
  if (cache) return cache;
  try {
    if (existsSync(STORE_FILE)) {
      cache = JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
      return cache!;
    }
  } catch {}
  cache = {};
  return cache;
}

function save() {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(cache, null, 2));
}

function sessionKey(sessionId: string, cwd: string): string {
  return sessionId || cwd;
}

export function getSessionMeta(sessionId: string, cwd: string): SessionMeta | undefined {
  const store = load();
  return store[sessionKey(sessionId, cwd)];
}

export function setSessionName(sessionId: string, cwd: string, name: string) {
  const store = load();
  const key = sessionKey(sessionId, cwd);
  if (!store[key]) store[key] = { name, isFavorite: false };
  else store[key].name = name;
  save();
}

export function toggleFavorite(sessionId: string, cwd: string): boolean {
  const store = load();
  const key = sessionKey(sessionId, cwd);
  if (!store[key]) store[key] = { name: '', isFavorite: true };
  else store[key].isFavorite = !store[key].isFavorite;
  save();
  return store[key].isFavorite;
}

export function getFavorites(): SessionStore {
  const store = load();
  const favs: SessionStore = {};
  for (const [k, v] of Object.entries(store)) {
    if (v.isFavorite) favs[k] = v;
  }
  return favs;
}
