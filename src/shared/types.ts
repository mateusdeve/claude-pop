export interface ClaudeSession {
  pid: number;
  sessionId: string;
  cwd: string;
  startedAt: string;
  kind: 'interactive' | 'other';
  entrypoint: string;
  tty?: string;
  name?: string;
  isFavorite?: boolean;
}

export type EventType =
  | 'permission_prompt'
  | 'idle_prompt'
  | 'elicitation_dialog'
  | 'notification'
  | 'tool_use'
  | 'unknown';

export interface OverlayEvent {
  id: string;
  type: EventType;
  sessionPid?: number;
  sessionId?: string;
  tool?: string;
  message?: string;
  raw: Record<string, unknown>;
  timestamp: number;
}

export interface PermissionRequest {
  id: string;
  event: OverlayEvent;
  resolve: (decision: PermissionDecision) => void;
}

export interface PermissionDecision {
  decision: 'allow' | 'deny';
  updatedInput?: Record<string, unknown>;
}

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface PendingQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface SessionMeta {
  name: string;
  isFavorite: boolean;
}

export type SessionStatus = 'idle' | 'working' | 'waiting' | 'unknown';
export type ApprovalMode = 'manual' | 'allow-all' | 'allow-session';

export interface OverlayState {
  sessions: ClaudeSession[];
  activeSessionPid: number | null;
  events: OverlayEvent[];
  pendingPermission: Omit<PermissionRequest, 'resolve'> | null;
  pendingQuestion: PendingQuestion | null;
  expanded: boolean;
  sessionStatus: SessionStatus;
  lastTool?: string;
  approvalMode: ApprovalMode;
}

export const IPC = {
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
} as const;
