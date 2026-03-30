import { execSync } from 'child_process';
import type { ClaudeSession } from '../shared/types';

/**
 * Find the TTY for a process.
 */
export function findTtyForPid(pid: number): string | undefined {
  try {
    let tty = execSync(`ps -p ${pid} -o tty=`, { encoding: 'utf-8' }).trim();
    if (tty && tty !== '??' && tty !== '') return `/dev/${tty}`;

    const ppid = execSync(`ps -p ${pid} -o ppid=`, { encoding: 'utf-8' }).trim();
    if (ppid) {
      tty = execSync(`ps -p ${ppid} -o tty=`, { encoding: 'utf-8' }).trim();
      if (tty && tty !== '??' && tty !== '') return `/dev/${tty}`;
    }
  } catch {}
  return undefined;
}

/**
 * Find the terminal app by walking up the process tree.
 */
function findTerminalApp(pid: number): string {
  const known: Record<string, string> = {
    'Terminal': 'Terminal',
    'iTerm': 'iTerm2',
    'Warp': 'Warp',
    'Alacritty': 'Alacritty',
    'kitty': 'kitty',
    'Cursor': 'Cursor',
    'Code': 'Code',
  };

  try {
    let cur = pid;
    for (let i = 0; i < 15; i++) {
      const ppid = execSync(`ps -p ${cur} -o ppid=`, { encoding: 'utf-8' }).trim();
      if (!ppid || ppid === '0' || ppid === '1') break;
      const comm = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf-8' }).trim();
      const base = comm.split('/').pop() || '';
      for (const [k, v] of Object.entries(known)) {
        if (base.includes(k)) return v;
      }
      cur = parseInt(ppid);
    }
  } catch {}
  return 'Cursor'; // default
}

/**
 * Sends text to a Claude Code session.
 *
 * On macOS, TIOCSTI is blocked so the only way to inject real keyboard input
 * is via AppleScript. We quickly focus the terminal, type, and restore focus.
 */
export function sendTextToSession(session: ClaudeSession, text: string): boolean {
  console.log(`[responder] Sending to PID ${session.pid}: "${text}"`);

  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const termApp = findTerminalApp(session.pid);
  console.log(`[responder] Terminal: ${termApp}`);

  try {
    // Save current frontmost app, switch to terminal, type, switch back
    const script = `
set frontApp to ""
tell application "System Events"
  set frontApp to name of first application process whose frontmost is true
end tell

tell application "${termApp}" to activate
delay 0.08

tell application "System Events"
  keystroke "${escaped}"
  keystroke return
end tell

delay 0.05
tell application frontApp to activate
`;
    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    console.log('[responder] Sent and restored focus');
    return true;
  } catch (err: any) {
    console.error('[responder] Failed:', err.message);
    return false;
  }
}
