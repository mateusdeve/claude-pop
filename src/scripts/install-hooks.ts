import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');
const HOOKS_DIR = resolve(join(__dirname, '..', '..', 'hooks'));

function main() {
  // Ensure .claude directory exists
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  // Read existing settings or create empty
  let settings: Record<string, any> = {};
  if (existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
    } catch {
      console.error('Warning: could not parse existing settings.json, creating new one');
    }
  }

  // Ensure hooks section exists
  if (!settings.hooks) settings.hooks = {};

  const notifyScript = join(HOOKS_DIR, 'notify-overlay.sh');
  const permissionScript = join(HOOKS_DIR, 'permission-gate.sh');
  const questionScript = join(HOOKS_DIR, 'question-gate.sh');

  // Add PreToolUse hook for permission gating + question gating
  if (!settings.hooks.PreToolUse) settings.hooks.PreToolUse = [];
  const hasPermissionHook = settings.hooks.PreToolUse.some((h: any) =>
    h.hooks?.some((hh: any) => hh.command?.includes('permission-gate.sh'))
  );
  if (!hasPermissionHook) {
    settings.hooks.PreToolUse.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: permissionScript,
        timeout: 130,
      }],
    });
    console.log('Added PreToolUse hook for permission gating');
  }

  const hasQuestionHook = settings.hooks.PreToolUse.some((h: any) =>
    h.hooks?.some((hh: any) => hh.command?.includes('question-gate.sh'))
  );
  if (!hasQuestionHook) {
    settings.hooks.PreToolUse.push({
      matcher: 'AskUserQuestion',
      hooks: [{
        type: 'command',
        command: questionScript,
        timeout: 130,
      }],
    });
    console.log('Added PreToolUse hook for question gating');
  }

  // Add Notification hook
  if (!settings.hooks.Notification) settings.hooks.Notification = [];
  const hasNotifyHook = settings.hooks.Notification.some((h: any) =>
    h.hooks?.some((hh: any) => hh.command?.includes('notify-overlay.sh'))
  );
  if (!hasNotifyHook) {
    settings.hooks.Notification.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: notifyScript,
        timeout: 5,
      }],
    });
    console.log('Added Notification hook');
  }

  // Write settings back
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
  console.log(`Updated ${SETTINGS_PATH}`);
  console.log('\nHook scripts:');
  console.log(`  ${notifyScript}`);
  console.log(`  ${permissionScript}`);
  console.log(`  ${questionScript}`);
  console.log('\nRestart any running Claude Code sessions for hooks to take effect.');
}

main();
