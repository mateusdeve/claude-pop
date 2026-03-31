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
  PANEL_HEIGHT: 'overlay:panel-height',
  SET_APPROVAL_MODE: 'overlay:set-approval-mode',
  CONTENT_HEIGHT: 'overlay:content-height',
  NEW_SESSION: 'overlay:new-session',
  GET_CONVERSATION: 'overlay:get-conversation',
  CONVERSATION_UPDATE: 'overlay:conversation-update',
  SEND_WITH_IMAGE: 'overlay:send-with-image',
  GET_COMMANDS: 'overlay:get-commands',
  SAVE_SESSION: 'overlay:save-session',
  GET_SAVED_SESSIONS: 'overlay:get-saved-sessions',
  REMOVE_SAVED_SESSION: 'overlay:remove-saved-session',
  RESUME_SESSION: 'overlay:resume-session',
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

  setPanelHeight(extraHeight: number) {
    ipcRenderer.send(IPC.PANEL_HEIGHT, extraHeight);
  },

  setApprovalMode(sessionId: string, mode: string) {
    ipcRenderer.send(IPC.SET_APPROVAL_MODE, { sessionId, mode });
  },

  reportContentHeight(height: number) {
    ipcRenderer.send(IPC.CONTENT_HEIGHT, height);
  },

  newSession() {
    ipcRenderer.send(IPC.NEW_SESSION);
  },

  getConversation(): Promise<any[]> {
    return ipcRenderer.invoke(IPC.GET_CONVERSATION);
  },

  onConversationUpdate(callback: (messages: any[]) => void) {
    const handler = (_: unknown, messages: any[]) => callback(messages);
    ipcRenderer.on(IPC.CONVERSATION_UPDATE, handler);
    return () => { ipcRenderer.removeListener(IPC.CONVERSATION_UPDATE, handler); };
  },

  sendWithImage(text: string, images: { base64: string; name: string }[], sessionPid: number) {
    ipcRenderer.send(IPC.SEND_WITH_IMAGE, { text, images, sessionPid });
  },

  getCommands(): Promise<any[]> {
    return ipcRenderer.invoke(IPC.GET_COMMANDS);
  },

  saveSession(sessionId: string, name: string, cwd: string) {
    ipcRenderer.send(IPC.SAVE_SESSION, { sessionId, name, cwd });
  },

  getSavedSessions(): Promise<any[]> {
    return ipcRenderer.invoke(IPC.GET_SAVED_SESSIONS);
  },

  removeSavedSession(sessionId: string) {
    ipcRenderer.send(IPC.REMOVE_SAVED_SESSION, sessionId);
  },

  resumeSession(sessionId: string, cwd: string) {
    ipcRenderer.send(IPC.RESUME_SESSION, { sessionId, cwd });
  },
};

contextBridge.exposeInMainWorld('overlayAPI', api);
