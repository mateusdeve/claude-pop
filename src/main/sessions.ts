import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { findTtyForPid } from './responder';
import { getSessionMeta } from './store';
import type { ClaudeSession } from '../shared/types';

const SESSIONS_DIR = join(homedir(), '.claude', 'sessions');
const POLL_INTERVAL = 5_000;

export class SessionManager {
  private sessions = new Map<number, ClaudeSession>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private onChange: (sessions: ClaudeSession[]) => void;

  constructor(onChange: (sessions: ClaudeSession[]) => void) {
    this.onChange = onChange;
  }

  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  getSessions(): ClaudeSession[] {
    return Array.from(this.sessions.values());
  }

  private isProcessAlive(pid: number): boolean {
    try {
      execSync(`ps -p ${pid} -o pid=`, { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }

  private getTty(pid: number): string | undefined {
    return findTtyForPid(pid);
  }

  private async poll() {
    try {
      const files = await readdir(SESSIONS_DIR);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      const seen = new Set<number>();

      for (const file of jsonFiles) {
        try {
          const content = await readFile(join(SESSIONS_DIR, file), 'utf-8');
          const data = JSON.parse(content);
          if (!data.pid || !this.isProcessAlive(data.pid)) continue;

          seen.add(data.pid);
          if (!this.sessions.has(data.pid)) {
            const sid = data.sessionId || '';
            const cwd = data.cwd || '';
            const meta = getSessionMeta(sid, cwd);
            const session: ClaudeSession = {
              pid: data.pid,
              sessionId: sid,
              cwd,
              startedAt: data.startedAt || '',
              kind: data.kind || 'interactive',
              entrypoint: data.entrypoint || 'cli',
              tty: this.getTty(data.pid),
              name: meta?.name,
              isFavorite: meta?.isFavorite,
            };
            this.sessions.set(data.pid, session);
          }
        } catch {
          // skip malformed files
        }
      }

      // Remove dead sessions
      for (const pid of this.sessions.keys()) {
        if (!seen.has(pid)) this.sessions.delete(pid);
      }

      this.onChange(this.getSessions());
    } catch {
      // sessions dir might not exist yet
    }
  }
}
