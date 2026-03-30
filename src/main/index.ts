import { app, BrowserWindow, globalShortcut, ipcMain, screen, Notification } from 'electron';
import { join } from 'path';
import { OverlayServer } from './server';
import { SessionManager } from './sessions';
import { sendTextToSession } from './responder';
import { createTray } from './tray';
import { getSessionMeta, setSessionName, toggleFavorite } from './store';
import type { OverlayState, PermissionDecision, OverlayEvent, ClaudeSession } from '../shared/types';
import { IPC } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let overlayServer: OverlayServer;
let sessionManager: SessionManager;

const state: OverlayState = {
  sessions: [],
  activeSessionPid: null,
  events: [],
  pendingPermission: null,
  pendingQuestion: null,
  expanded: false,
  sessionStatus: 'unknown',
  lastTool: undefined,
};

const BAR_WIDTH = 520;
const BAR_HEIGHT_NORMAL = 54;
const BAR_HEIGHT_PERMISSION = 100;
const BAR_HEIGHT_QUESTION = 320;
const BAR_HEIGHT_QUESTION_TEXT = 150;
const BAR_HEIGHT_SESSION_ITEM = 40;
const BAR_HEIGHT_SESSION_PAD = 14;
const MARGIN_BOTTOM = 40;

let sessionListOpen = false;
let sessionListCount = 0;

function sendState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.STATE_UPDATE, state);
  }
}

function notify(title: string, body: string) {
  if (!state.expanded && Notification.isSupported()) {
    const n = new Notification({ title, body, silent: false });
    n.on('click', () => showBar());
    n.show();
  }
}

function updateStatus(event: OverlayEvent) {
  state.lastTool = event.tool;
  if (event.type === 'permission_prompt' || event.type === 'elicitation_dialog' || event.type === 'idle_prompt') {
    state.sessionStatus = 'waiting';
  } else if (event.type === 'tool_use') {
    state.sessionStatus = 'working';
  } else {
    state.sessionStatus = 'working';
  }
}

function pushEvent(event: OverlayEvent) {
  state.events = [event, ...state.events].slice(0, 50);
  updateStatus(event);
  sendState();
}

function getContentHeight(): number {
  const sessionListHeight = sessionListOpen
    ? BAR_HEIGHT_SESSION_PAD + Math.min(sessionListCount, 5) * BAR_HEIGHT_SESSION_ITEM
    : 0;
  if (state.pendingQuestion) {
    return state.pendingQuestion.options.length > 0 ? BAR_HEIGHT_QUESTION : BAR_HEIGHT_QUESTION_TEXT;
  }
  return state.pendingPermission ? BAR_HEIGHT_PERMISSION + sessionListHeight
    : BAR_HEIGHT_NORMAL + sessionListHeight;
}

let userHasRepositioned = false;

function resizeBar() {
  if (!mainWindow || !state.expanded) return;
  const h = getContentHeight();
  mainWindow.setMinimumSize(BAR_WIDTH, h);
  mainWindow.setSize(BAR_WIDTH, h);
  if (!userHasRepositioned) {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(
      Math.round(screenWidth / 2 - BAR_WIDTH / 2),
      screenHeight - h - MARGIN_BOTTOM
    );
  }
}

function showBar() {
  if (!mainWindow) return;
  state.expanded = true;
  resizeBar();
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
    height: BAR_HEIGHT_NORMAL,
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

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setBackgroundColor('#00000000');

  mainWindow.on('moved', () => {
    userHasRepositioned = true;
  });

  mainWindow.loadFile(join(__dirname, '..', 'renderer', 'index.html'));

  // mainWindow.on('blur', () => {
  //   if (state.expanded) hideBar();
  // });

  mainWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log('[renderer]', message);
  });

  if (process.env.DEBUG_OVERLAY) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function setupIPC() {
  ipcMain.handle(IPC.GET_STATE, () => state);

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

  ipcMain.on(IPC.SESSION_LIST_TOGGLE, (_e, { open, count }: { open: boolean; count: number }) => {
    sessionListOpen = open;
    sessionListCount = count;
    resizeBar();
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
    state.sessions = sessions;
    if (!state.activeSessionPid && sessions.length > 0) {
      state.activeSessionPid = sessions[0].pid;
    }
    if (state.activeSessionPid && !sessions.find((s) => s.pid === state.activeSessionPid)) {
      state.activeSessionPid = sessions.length > 0 ? sessions[0].pid : null;
    }
    sendState();
  });
  sessionManager.start();

  // HTTP server
  overlayServer = new OverlayServer();
  await overlayServer.start();

  overlayServer.on('event', (event: OverlayEvent) => {
    pushEvent(event);
    if (event.type === 'idle_prompt') {
      notify('Claude idle', 'Claude is waiting for input');
      showBar();
    } else if (event.type === 'elicitation_dialog') {
      showBar();
    }
  });

  overlayServer.on('permission', ({ id, event }: { id: string; event: OverlayEvent }) => {
    state.pendingPermission = { id, event };
    pushEvent(event);
    notify('Permission needed', event.message || `${event.tool || 'Action'} requires approval`);
    showBar();
    resizeBar();
  });

  overlayServer.on('question', ({ id, event, toolInput }: { id: string; event: OverlayEvent; toolInput: Record<string, unknown> }) => {
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
  });

  createTray(() => {
    sessionManager.stop();
  });

  console.log('Claude Overlay ready. Press Ctrl+J to toggle.');
}

main().catch(console.error);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Don't quit — the overlay stays hidden until toggled
});
