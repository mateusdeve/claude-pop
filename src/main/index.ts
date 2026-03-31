import { app, BrowserWindow, globalShortcut, ipcMain, screen, Notification, nativeImage, dialog } from 'electron';
import { join } from 'path';
import { exec } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { OverlayServer } from './server';
import { SessionManager } from './sessions';
import { sendTextToSession } from './responder';
import { createTray } from './tray';
import { initAutoUpdater } from './updater';
import { getSessionMeta, setSessionName, toggleFavorite, getConfig, setPosition, saveSession, getSavedSessions, removeSavedSession, type OverlayPosition } from './store';
import { buildConversationPath, readLastMessages, watchConversation } from './conversation';
import { scanCommands } from './commands';
import type { OverlayState, PermissionDecision, OverlayEvent, ClaudeSession, ConversationMessage } from '../shared/types';
import { IPC } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let overlayServer: OverlayServer;
let sessionManager: SessionManager;
let conversationWatcher: { stop: () => void } | null = null;
let conversationMessages: ConversationMessage[] = [];

const state: OverlayState = {
  sessions: [],
  activeSessionPid: null,
  events: [],
  pendingPermission: null,
  pendingQuestion: null,
  expanded: false,
  sessionStatus: 'unknown',
  lastTool: undefined,
  approvalMode: 'manual',
  sessionApprovalModes: {},
};

/** Get approval mode for a specific session (falls back to 'manual') */
function getSessionMode(sessionId?: string): string {
  if (!sessionId) return 'manual';
  return state.sessionApprovalModes[sessionId] || 'manual';
}

/** Map Claude Code's permission_mode string to our ApprovalMode */
function mapClaudeMode(permissionMode?: string): 'manual' | 'allow-session' | 'allow-all' | null {
  if (!permissionMode) return null;
  switch (permissionMode) {
    case 'default': return 'manual';
    case 'acceptEdits': return 'allow-session';
    case 'bypassPermissions': return 'allow-all';
    default: return null;
  }
}

/** Sync session approval mode from Claude Code's hook data */
function syncSessionMode(event: OverlayEvent) {
  if (!event.sessionId || !event.permissionMode) return;
  const mapped = mapClaudeMode(event.permissionMode);
  if (mapped) {
    state.sessionApprovalModes[event.sessionId] = mapped;
  }
}

const BAR_WIDTH = 520;
const MARGIN_BOTTOM = 40;

let reportedHeight = 48;

function sendState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.STATE_UPDATE, state);
  }
}

function sendConversation() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.CONVERSATION_UPDATE, conversationMessages);
  }
}

async function startConversationWatch(session: ClaudeSession) {
  // Stop previous watcher
  if (conversationWatcher) {
    conversationWatcher.stop();
    conversationWatcher = null;
  }
  conversationMessages = [];

  if (!session.sessionId || !session.cwd) return;

  const filePath = buildConversationPath(session.cwd, session.sessionId);
  conversationMessages = await readLastMessages(filePath);
  sendConversation();

  conversationWatcher = watchConversation(filePath, (msgs) => {
    conversationMessages = msgs;
    sendConversation();
  });
}

function notify(title: string, body: string) {
  if (!state.expanded && Notification.isSupported()) {
    const iconPath = join(__dirname, '..', '..', 'assets', 'icon.png');
    const n = new Notification({ title, body, silent: false, icon: nativeImage.createFromPath(iconPath) });
    n.on('click', () => showBar());
    n.show();
  }
}

let idleTimer: ReturnType<typeof setTimeout> | null = null;

function updateStatus(event: OverlayEvent) {
  state.lastTool = event.tool;
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }

  if (event.type === 'permission_prompt' || event.type === 'elicitation_dialog' || event.type === 'idle_prompt') {
    state.sessionStatus = 'waiting';
  } else {
    state.sessionStatus = 'working';
    // Go idle after 3s without new events
    idleTimer = setTimeout(() => {
      state.sessionStatus = 'idle';
      sendState();
    }, 3000);
  }
}

function pushEvent(event: OverlayEvent) {
  state.events = [event, ...state.events].slice(0, 50);
  updateStatus(event);
  sendState();
}

function getContentHeight(): number {
  return reportedHeight;
}

function positionBar() {
  if (!mainWindow) return;
  const h = getContentHeight();
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const pos = getConfig().position;
  const margin = MARGIN_BOTTOM;

  let x: number, y: number;
  switch (pos) {
    case 'top-left':     x = margin; y = margin; break;
    case 'top-center':   x = Math.round(sw / 2 - BAR_WIDTH / 2); y = margin; break;
    case 'top-right':    x = sw - BAR_WIDTH - margin; y = margin; break;
    case 'bottom-left':  x = margin; y = sh - h - margin; break;
    case 'bottom-right': x = sw - BAR_WIDTH - margin; y = sh - h - margin; break;
    case 'bottom-center':
    default:             x = Math.round(sw / 2 - BAR_WIDTH / 2); y = sh - h - margin; break;
  }

  mainWindow.setSize(BAR_WIDTH, h);
  mainWindow.setPosition(x, y);
}

function resizeBar() {
  if (!mainWindow) return;
  positionBar();
}

function showBar() {
  if (!mainWindow) return;
  state.expanded = true;
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  positionBar();
  mainWindow.show();
  mainWindow.focus();
  sendState();
}

function hideBar() {
  if (!mainWindow) return;
  state.expanded = false;
  mainWindow.hide();
  sendState();
}

function toggleBar() {
  if (state.expanded) hideBar();
  else showBar();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: BAR_WIDTH,
    height: 48,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setBackgroundColor('#00000000');
  mainWindow.loadFile(join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log('[renderer]', message);
  });

  if (process.env.DEBUG_OVERLAY) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function setupIPC() {
  ipcMain.handle(IPC.GET_STATE, () => state);
  ipcMain.handle(IPC.GET_CONVERSATION, () => conversationMessages);
  ipcMain.handle(IPC.GET_COMMANDS, () => {
    const active = state.sessions.find(s => s.pid === state.activeSessionPid);
    return scanCommands(active?.cwd);
  });

  ipcMain.on(IPC.TOGGLE_PANEL, () => toggleBar());

  ipcMain.on(IPC.PERMISSION_RESPOND, (_e, decision: PermissionDecision) => {
    if (state.pendingPermission) {
      overlayServer.respondPermission(state.pendingPermission.id, decision);
      state.pendingPermission = null;
      state.sessionStatus = 'working';
      resizeBar();
      sendState();
    }
  });

  ipcMain.on(IPC.TEXT_RESPOND, (_e, { text, sessionPid }: { text: string; sessionPid: number }) => {
    console.log(`IPC TEXT_RESPOND: text="${text}" sessionPid=${sessionPid}`);
    const session = state.sessions.find((s) => s.pid === sessionPid);
    if (session) {
      sendTextToSession(session, text);
    } else {
      console.error(`No session found for PID ${sessionPid}`);
    }
  });

  ipcMain.on(IPC.SELECT_SESSION, (_e, pid: number) => {
    state.activeSessionPid = pid;
    const session = state.sessions.find(s => s.pid === pid);
    if (session) startConversationWatch(session);
    sendState();
  });

  ipcMain.on(IPC.RENAME_SESSION, (_e, { pid, name }: { pid: number; name: string }) => {
    const session = state.sessions.find((s) => s.pid === pid);
    if (session) {
      session.name = name;
      setSessionName(session.sessionId, session.cwd, name);
      sendState();
    }
  });

  ipcMain.on(IPC.TOGGLE_FAVORITE, (_e, pid: number) => {
    const session = state.sessions.find((s) => s.pid === pid);
    if (session) {
      session.isFavorite = toggleFavorite(session.sessionId, session.cwd);
      sendState();
    }
  });

  ipcMain.on(IPC.QUESTION_RESPOND, (_e, answer: Record<string, unknown>) => {
    if (state.pendingQuestion) {
      overlayServer.respondQuestion(state.pendingQuestion.id, answer);
      state.pendingQuestion = null;
      resizeBar();
      sendState();
    }
  });

  ipcMain.on(IPC.SESSION_LIST_TOGGLE, () => {
    // Height is now reported by renderer via CONTENT_HEIGHT
  });

  ipcMain.on(IPC.PANEL_HEIGHT, () => {
    // Height is now reported by renderer via CONTENT_HEIGHT
  });

  ipcMain.on(IPC.CONTENT_HEIGHT, (_e, height: number) => {
    if (height > 0 && height !== reportedHeight) {
      reportedHeight = height;
      positionBar();
    }
  });

  ipcMain.on(IPC.NEW_SESSION, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Escolha a pasta do projeto',
      properties: ['openDirectory'],
      buttonLabel: 'Abrir com Claude',
    });
    if (result.canceled || result.filePaths.length === 0) return;
    const dir = result.filePaths[0];
    if (process.platform === 'darwin') {
      exec(`osascript -e '
        tell application "Terminal"
          activate
          do script "cd ${dir.replace(/'/g, "\\'")} && claude"
        end tell
      '`);
    } else {
      exec(`x-terminal-emulator -e "bash -c 'cd ${dir} && claude'"`);
    }
  });

  ipcMain.on(IPC.SET_APPROVAL_MODE, (_e, { sessionId, mode }: { sessionId: string; mode: string }) => {
    // Store per-session mode
    state.sessionApprovalModes[sessionId] = mode as any;
    // Also update global for backward compat
    state.approvalMode = mode as any;

    // Auto-resolve pending permission if switching to bypass mode for that session
    if (state.pendingPermission) {
      const pendingSid = state.pendingPermission.event.sessionId;
      if (pendingSid === sessionId && mode === 'allow-all') {
        overlayServer.respondPermission(state.pendingPermission.id, { decision: 'allow' });
        state.pendingPermission = null;
        resizeBar();
      }
    }

    sendState();
  });

  ipcMain.on(IPC.SEND_WITH_IMAGE, (_e, { text, images, sessionPid }: { text: string; images: { base64: string; name: string }[]; sessionPid: number }) => {
    const session = state.sessions.find(s => s.pid === sessionPid);
    if (!session) return;

    const imgDir = join(tmpdir(), 'claude-overlay');
    if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });

    const paths: string[] = [];
    for (const img of images) {
      const ext = img.name.split('.').pop() || 'png';
      const fileName = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const filePath = join(imgDir, fileName);
      const raw = img.base64.replace(/^data:image\/\w+;base64,/, '');
      writeFileSync(filePath, Buffer.from(raw, 'base64'));
      paths.push(filePath);
    }

    const message = [text, ...paths].filter(Boolean).join(' ');
    sendTextToSession(session, message);
    console.log(`[image] Saved ${paths.length} image(s), sending: ${message}`);
  });

  ipcMain.handle(IPC.GET_SAVED_SESSIONS, () => getSavedSessions());

  ipcMain.on(IPC.SAVE_SESSION, (_e, { sessionId, name, cwd }: { sessionId: string; name: string; cwd: string }) => {
    saveSession(sessionId, name, cwd);
  });

  ipcMain.on(IPC.REMOVE_SAVED_SESSION, (_e, sessionId: string) => {
    removeSavedSession(sessionId);
  });

  ipcMain.on(IPC.RESUME_SESSION, (_e, { sessionId, cwd }: { sessionId: string; cwd: string }) => {
    if (process.platform === 'darwin') {
      exec(`osascript -e '
        tell application "Terminal"
          activate
          do script "cd ${cwd.replace(/'/g, "\\'")} && claude --resume ${sessionId}"
        end tell
      '`);
    } else {
      exec(`x-terminal-emulator -e "bash -c 'cd ${cwd} && claude --resume ${sessionId}'"`);
    }
  });

  ipcMain.on(IPC.QUESTION_SKIP, () => {
    if (state.pendingQuestion) {
      overlayServer.skipQuestion(state.pendingQuestion.id);
      state.pendingQuestion = null;
      resizeBar();
      sendState();
    }
  });
}

async function main() {
  await app.whenReady();

  app.dock?.hide();
  initAutoUpdater();

  createWindow();
  setupIPC();

  // Global shortcut: Cmd+J (macOS) / Ctrl+J (other)
  const shortcut = process.platform === 'darwin' ? 'Command+J' : 'Control+J';
  const registered = globalShortcut.register(shortcut, () => toggleBar());
  if (!registered) {
    console.error(`Failed to register global shortcut ${shortcut}`);
  }

  // Session monitoring (start before server so sessions are available immediately)
  sessionManager = new SessionManager((sessions: ClaudeSession[]) => {
    const prevPid = state.activeSessionPid;
    state.sessions = sessions;
    if (!state.activeSessionPid && sessions.length > 0) {
      state.activeSessionPid = sessions[0].pid;
    }
    if (state.activeSessionPid && !sessions.find((s) => s.pid === state.activeSessionPid)) {
      state.activeSessionPid = sessions.length > 0 ? sessions[0].pid : null;
    }
    // Start conversation watch if active session changed
    if (state.activeSessionPid !== prevPid) {
      const session = sessions.find(s => s.pid === state.activeSessionPid);
      if (session) startConversationWatch(session);
    }
    sendState();
  });
  sessionManager.start();

  // HTTP server
  overlayServer = new OverlayServer();
  await overlayServer.start();

  overlayServer.on('event', (event: OverlayEvent) => {
    // Tag event with session pid (don't switch active session)
    if (event.sessionId) {
      const match = state.sessions.find(s => s.sessionId === event.sessionId);
      if (match) event.sessionPid = match.pid;
    }
    syncSessionMode(event);
    pushEvent(event);
    if (event.type === 'idle_prompt') {
      notify('Claude idle', 'Claude is waiting for input');
      showBar();
    } else if (event.type === 'elicitation_dialog') {
      showBar();
    }
  });

  overlayServer.on('permission', ({ id, event }: { id: string; event: OverlayEvent }) => {
    // Tag event with session pid (don't switch active session)
    if (event.sessionId) {
      const match = state.sessions.find(s => s.sessionId === event.sessionId);
      if (match) event.sessionPid = match.pid;
    }
    syncSessionMode(event);

    pushEvent(event);

    // Check THIS SESSION's approval mode (synced from Claude Code)
    const mode = getSessionMode(event.sessionId);

    if (mode === 'allow-all') {
      overlayServer.respondPermission(id, { decision: 'allow' });
      return;
    }
    if (mode === 'allow-session') {
      // allow-session: auto-approve edits (Read, Write, Edit, Glob, Grep)
      const editTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Ler arquivo', 'Escrever arquivo', 'Editar arquivo', 'Buscar arquivos', 'Buscar conteúdo'];
      const rawToolName = event.raw.toolName as string | undefined;
      if (rawToolName && editTools.includes(rawToolName)) {
        overlayServer.respondPermission(id, { decision: 'allow' });
        return;
      }
    }

    // Manual mode — show in overlay
    state.pendingPermission = { id, event };
    notify('Permissão necessária', event.message || `${event.tool || 'Ação'} precisa de aprovação`);
    showBar();
    resizeBar();
    sendState();
  });

  overlayServer.on('question', ({ id, event, toolInput }: { id: string; event: OverlayEvent; toolInput: Record<string, unknown> }) => {
    // Tag event with session pid (don't switch active session)
    if (event.sessionId) {
      const match = state.sessions.find(s => s.sessionId === event.sessionId);
      if (match) event.sessionPid = match.pid;
    }
    syncSessionMode(event);

    const question = (toolInput.question as string) || event.message || 'Claude needs input';
    const options = ((toolInput.options as any[]) || []).map((o: any) => ({
      label: typeof o === 'string' ? o : o.label || '',
      description: typeof o === 'string' ? undefined : o.description,
    }));
    const multiSelect = toolInput.multiSelect === true;

    state.pendingQuestion = { id, question, options, multiSelect };
    pushEvent(event);
    notify('Claude asks', question);
    showBar();
    resizeBar();
    sendState();
  });

  createTray(
    () => { sessionManager.stop(); },
    () => { if (state.expanded) positionBar(); },
    () => toggleBar(),
  );

  console.log('Claude Overlay ready. Press Ctrl+J to toggle.');
}

main().catch(console.error);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Don't quit — the overlay stays hidden until toggled
});
