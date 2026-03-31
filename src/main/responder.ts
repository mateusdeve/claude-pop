import { execSync } from 'child_process';
import type { ClaudeSession } from '../shared/types';

const platform = process.platform;

/**
 * Find the TTY for a process.
 */
export function findTtyForPid(pid: number): string | undefined {
  try {
    if (platform === 'win32') {
      // Windows doesn't have TTYs in the same way
      return undefined;
    }
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
 * Find the terminal app by walking up the process tree (macOS only).
 */
function findTerminalApp(pid: number): string {
  try {
    let cur = pid;
    for (let i = 0; i < 15; i++) {
      const ppid = execSync(`ps -p ${cur} -o ppid=`, { encoding: 'utf-8' }).trim();
      if (!ppid || ppid === '0' || ppid === '1') break;
      const comm = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf-8' }).trim();

      // Extract .app name from full path (e.g. "/Applications/Antigravity.app/Contents/..." → "Antigravity")
      const appMatch = comm.match(/\/([^/]+)\.app\//);
      if (appMatch) {
        const appName = appMatch[1];
        console.log(`[responder] Detected app from path: ${appName}`);
        return appName;
      }

      cur = parseInt(ppid);
    }
  } catch {}

  return 'Terminal';
}

/**
 * Send text to terminal on macOS via AppleScript.
 */
function sendTextMacOS(session: ClaudeSession, text: string): boolean {
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const termApp = findTerminalApp(session.pid);
  console.log(`[responder] Terminal: ${termApp}`);

  try {
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
    return true;
  } catch (err: any) {
    console.error('[responder] macOS failed:', err.message);
    return false;
  }
}

/**
 * Send text to terminal on Linux via xdotool.
 */
function sendTextLinux(session: ClaudeSession, text: string): boolean {
  try {
    // Find the window containing the process
    const escaped = text.replace(/'/g, "'\\''");
    // Type the text and press Enter
    execSync(`xdotool type --delay 10 '${escaped}' && xdotool key Return`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return true;
  } catch (err: any) {
    console.error('[responder] Linux failed:', err.message);
    // Fallback: write to TTY directly
    if (session.tty) {
      try {
        execSync(`echo '${text.replace(/'/g, "'\\''")}' > ${session.tty}`, {
          encoding: 'utf-8',
          timeout: 2000,
        });
        return true;
      } catch {}
    }
    return false;
  }
}

/**
 * Send text to terminal on Windows via PowerShell SendKeys.
 */
function sendTextWindows(session: ClaudeSession, text: string): boolean {
  try {
    const escaped = text.replace(/'/g, "''").replace(/"/g, '`"');
    const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait('${escaped}{ENTER}')
`;
    execSync(`powershell -Command "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    return true;
  } catch (err: any) {
    console.error('[responder] Windows failed:', err.message);
    return false;
  }
}

/**
 * Sends text to a Claude Code session (cross-platform).
 */
export function sendTextToSession(session: ClaudeSession, text: string): boolean {
  console.log(`[responder] Sending to PID ${session.pid}: "${text}"`);

  switch (platform) {
    case 'darwin':
      return sendTextMacOS(session, text);
    case 'linux':
      return sendTextLinux(session, text);
    case 'win32':
      return sendTextWindows(session, text);
    default:
      console.error(`[responder] Unsupported platform: ${platform}`);
      return false;
  }
}
