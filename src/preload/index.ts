import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  STATE_UPDATE: 'overlay:state-update',
  PERMISSION_RESPOND: 'overlay:permission-respond',
  TEXT_RESPOND: 'overlay:text-respond',
  TOGGLE_PANEL: 'overlay:toggle-panel',
  SELECT_SESSION: 'overlay:select-session',
  GET_STATE: 'overlay:get-state',
  RENAME_SESSION: 'overlay:rename-session',
  TOGGLE_FAVORITE: 'overlay:toggle-favorite',
  QUESTION_RESPOND: 'overlay:question-respond',
  QUESTION_SKIP: 'overlay:question-skip',
  SESSION_LIST_TOGGLE: 'overlay:session-list-toggle',
} as const;

const api = {
  onStateUpdate(callback: (state: any) => void) {
    const handler = (_: unknown, state: any) => callback(state);
    ipcRenderer.on(IPC.STATE_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC.STATE_UPDATE, handler); };
  },

  getState(): Promise<any> {
    return ipcRenderer.invoke(IPC.GET_STATE);
  },

  respondPermission(decision: any) {
    ipcRenderer.send(IPC.PERMISSION_RESPOND, decision);
  },

  respondText(text: string, sessionPid: number) {
    ipcRenderer.send(IPC.TEXT_RESPOND, { text, sessionPid });
  },

  togglePanel() {
    ipcRenderer.send(IPC.TOGGLE_PANEL);
  },

  selectSession(pid: number) {
    ipcRenderer.send(IPC.SELECT_SESSION, pid);
  },

  renameSession(pid: number, name: string) {
    ipcRenderer.send(IPC.RENAME_SESSION, { pid, name });
  },

  toggleFavorite(pid: number) {
    ipcRenderer.send(IPC.TOGGLE_FAVORITE, pid);
  },

  respondQuestion(answer: any) {
    ipcRenderer.send(IPC.QUESTION_RESPOND, answer);
  },

  skipQuestion() {
    ipcRenderer.send(IPC.QUESTION_SKIP);
  },

  toggleSessionList(open: boolean, count: number) {
    ipcRenderer.send(IPC.SESSION_LIST_TOGGLE, { open, count });
  },
};

contextBridge.exposeInMainWorld('overlayAPI', api);
