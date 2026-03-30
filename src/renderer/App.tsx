import { useState, useEffect, useRef } from 'react';
import type { OverlayState, PermissionDecision, PendingQuestion, SessionStatus, OverlayEvent, ApprovalMode } from '../shared/types';

const api = (window as any).overlayAPI;

/* ===== Figma SVG Icons ===== */

const IconGrid = () => (
  <svg width="10" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.35289 3.7049C3.54789 3.7049 3.70539 3.5474 3.70539 3.3524C3.70539 3.1574 3.54789 2.9999 3.35289 2.9999C3.15789 2.9999 3.00039 3.1574 3.00039 3.3524C3.00039 3.5474 3.15789 3.7049 3.35289 3.7049ZM4.30539 3.3524C4.30539 3.8774 3.87789 4.3049 3.35289 4.3049C2.82789 4.3049 2.40039 3.8774 2.40039 3.3524C2.40039 2.8274 2.82789 2.3999 3.35289 2.3999C3.87789 2.3999 4.30539 2.8274 4.30539 3.3524ZM6.45789 3.7049C6.65289 3.7049 6.81039 3.5474 6.81039 3.3524C6.81039 3.1574 6.65289 2.9999 6.45789 2.9999C6.26289 2.9999 6.10539 3.1574 6.10539 3.3524C6.10539 3.5474 6.26289 3.7049 6.45789 3.7049ZM7.41039 3.3524C7.41039 3.8774 6.98289 4.3049 6.45789 4.3049C5.93289 4.3049 5.50539 3.8774 5.50539 3.3524C5.50539 2.8274 5.93289 2.3999 6.45789 2.3999C6.98289 2.3999 7.41039 2.8274 7.41039 3.3524ZM3.00039 6.4549C3.00039 6.6499 3.15789 6.8074 3.35289 6.8074C3.54789 6.8074 3.70539 6.6499 3.70539 6.4549C3.70539 6.2599 3.54789 6.1024 3.35289 6.1024C3.15789 6.1024 3.00039 6.2599 3.00039 6.4549ZM3.35289 7.4074C2.82789 7.4074 2.40039 6.9799 2.40039 6.4549C2.40039 5.9299 2.82789 5.5024 3.35289 5.5024C3.87789 5.5024 4.30539 5.9299 4.30539 6.4549C4.30539 6.9799 3.87789 7.4074 3.35289 7.4074ZM6.45789 6.8074C6.65289 6.8074 6.81039 6.6499 6.81039 6.4549C6.81039 6.2599 6.65289 6.1024 6.45789 6.1024C6.26289 6.1024 6.10539 6.2599 6.10539 6.4549C6.10539 6.6499 6.26289 6.8074 6.45789 6.8074ZM7.41039 6.4549C7.41039 6.9799 6.98289 7.4074 6.45789 7.4074C5.93289 7.4074 5.50539 6.9799 5.50539 6.4549C5.50539 5.9299 5.93289 5.5024 6.45789 5.5024C6.98289 5.5024 7.41039 5.9299 7.41039 6.4549ZM3.00039 9.5449C3.00039 9.7399 3.15789 9.8974 3.35289 9.8974C3.54789 9.8974 3.70539 9.7399 3.70539 9.5449C3.70539 9.3499 3.54789 9.1924 3.35289 9.1924C3.15789 9.1924 3.00039 9.3499 3.00039 9.5449ZM3.35289 10.4974C2.82789 10.4974 2.40039 10.0699 2.40039 9.5449C2.40039 9.0199 2.82789 8.5924 3.35289 8.5924C3.87789 8.5924 4.30539 9.0199 4.30539 9.5449C4.30539 10.0699 3.87789 10.4974 3.35289 10.4974ZM6.45789 9.8974C6.65289 9.8974 6.81039 9.7399 6.81039 9.5449C6.81039 9.3499 6.65289 9.1924 6.45789 9.1924C6.26289 9.1924 6.10539 9.3499 6.10539 9.5449C6.10539 9.7399 6.26289 9.8974 6.45789 9.8974ZM7.41039 9.5449C7.41039 10.0699 6.98289 10.4974 6.45789 10.4974C5.93289 10.4974 5.50539 10.0699 5.50539 9.5449C5.50539 9.0199 5.93289 8.5924 6.45789 8.5924C6.98289 8.5924 7.41039 9.0199 7.41039 9.5449ZM3.00039 12.6474C3.00039 12.8424 3.15789 12.9999 3.35289 12.9999C3.54789 12.9999 3.70539 12.8424 3.70539 12.6474C3.70539 12.4524 3.54789 12.2949 3.35289 12.2949C3.15789 12.2949 3.00039 12.4524 3.00039 12.6474ZM3.35289 13.5999C2.82789 13.5999 2.40039 13.1724 2.40039 12.6474C2.40039 12.1224 2.82789 11.6949 3.35289 11.6949C3.87789 11.6949 4.30539 12.1224 4.30539 12.6474C4.30539 13.1724 3.87789 13.5999 3.35289 13.5999ZM6.45789 12.9999C6.65289 12.9999 6.81039 12.8424 6.81039 12.6474C6.81039 12.4524 6.65289 12.2949 6.45789 12.2949C6.26289 12.2949 6.10539 12.4524 6.10539 12.6474C6.10539 12.8424 6.26289 12.9999 6.45789 12.9999ZM7.41039 12.6474C7.41039 13.1724 6.98289 13.5999 6.45789 13.5999C5.93289 13.5999 5.50539 13.1724 5.50539 12.6474C5.50539 12.1224 5.93289 11.6949 6.45789 11.6949C6.98289 11.6949 7.41039 12.1224 7.41039 12.6474Z" fill="#525252"/>
  </svg>
);

/* Mascot SVGs for each approval mode — from Figma assets */
const IconMascotDefault = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.6318 5.05273H10.1055V7.5791H12.6318V5.05273H15.1582V10.1055H12.6318V12.6318H7.5791V15.1582H5.05273V12.6318H2.52637V10.1055H0V5.05273H2.52637V2.52637H12.6318V5.05273ZM15.1582 15.1582H12.6318V12.6318H15.1582V15.1582ZM5.05273 7.5791H7.5791V5.05273H5.05273V7.5791ZM2.52637 2.52637H0V0H2.52637V2.52637Z" fill="#737373"/>
  </svg>
);

const IconMascotSection = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.6318 5.05273H10.1055V7.5791H12.6318V5.05273H15.1582V10.1055H12.6318V12.6318H7.5791V15.1582H5.05273V12.6318H2.52637V10.1055H0V5.05273H2.52637V2.52637H12.6318V5.05273ZM15.1582 15.1582H12.6318V12.6318H15.1582V15.1582ZM5.05273 7.5791H7.5791V5.05273H5.05273V7.5791ZM2.52637 2.52637H0V0H2.52637V2.52637Z" fill="#FF809D"/>
  </svg>
);

const IconMascotFull = () => (
  <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.6318 5.47363H10.1055V8H12.6318V5.47363H15.1582V10.5264H12.6318V13.0527H7.5791V15.5791H5.05273V13.0527H2.52637V10.5264H0V5.47363H2.52637V2.94727H12.6318V5.47363ZM15.1582 15.5791H12.6318V13.0527H15.1582V15.5791ZM5.05273 8H7.5791V5.47363H5.05273V8ZM2.52637 2.94727H0V0.420898H2.52637V2.94727Z" fill="#FF1A4F"/>
    <path d="M7.57812 7.99334V5.47314H5.05793L7.57812 7.99334Z" fill="#FF1A4F"/>
    <path d="M10.0567 7.99334V5.47314H12.5769L10.0567 7.99334Z" fill="#FF1A4F"/>
  </svg>
);

const MascotButton = ({ mode, onClick }: { mode: ApprovalMode; onClick: () => void }) => {
  const titles: Record<ApprovalMode, string> = {
    'manual': 'Manual — pedir permissao para tudo',
    'allow-session': 'Accept edits — auto-aprova leitura/escrita',
    'allow-all': 'Bypass — auto-aprova tudo nesta sessao',
  };
  return (
    <button className="mascot-btn" onClick={onClick} title={titles[mode]}>
      {mode === 'manual' && <IconMascotDefault />}
      {mode === 'allow-session' && <IconMascotSection />}
      {mode === 'allow-all' && <IconMascotFull />}
    </button>
  );
};

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.6 8.00001C13.6 11.0925 11.0925 13.6 8.00001 13.6C4.90751 13.6 2.40001 11.0925 2.40001 8.00001C2.40001 4.90751 4.90751 2.40001 8.00001 2.40001C11.0925 2.40001 13.6 4.90751 13.6 8.00001ZM1.60001 8.00001C1.60001 11.535 4.46501 14.4 8.00001 14.4C11.535 14.4 14.4 11.535 14.4 8.00001C14.4 4.46501 11.535 1.60001 8.00001 1.60001C4.46501 1.60001 1.60001 4.46501 1.60001 8.00001ZM7.60001 4.40001V8.00001C7.60001 8.13501 7.66751 8.25751 7.77751 8.33251L10.1775 9.93251C10.3625 10.055 10.61 10.005 10.7325 9.82251C10.855 9.64001 10.805 9.39001 10.6225 9.26751L8.40001 7.78501V4.40001C8.40001 4.18001 8.22001 4.00001 8.00001 4.00001C7.78001 4.00001 7.60001 4.18001 7.60001 4.40001Z" fill="white"/>
  </svg>
);

const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.69016 8.86876C5.86641 9.04501 6.15141 9.04501 6.32578 8.86876L10.0758 5.11876C10.252 4.94251 10.252 4.65751 10.0758 4.48314C9.89953 4.30876 9.61453 4.30689 9.44016 4.48314L6.00891 7.91439L2.57766 4.48314C2.40141 4.30689 2.11641 4.30689 1.94203 4.48314C1.76766 4.65939 1.76578 4.94439 1.94203 5.11876L5.69203 8.86876H5.69016Z" fill="white"/>
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.04748 8.60001L3.17248 12.815L12.33 8.60001H5.04748ZM12.33 7.40001L3.17248 3.18501L5.04748 7.40001H12.33ZM1.66998 13.24L3.99998 8.00001L1.66998 2.76001C1.62498 2.65501 1.59998 2.54001 1.59998 2.42501C1.59998 1.97001 1.96748 1.60001 2.41998 1.60001C2.53748 1.60001 2.65498 1.62501 2.76248 1.67501L14.655 7.15001C14.9875 7.30251 15.2 7.63501 15.2 8.00001C15.2 8.36501 14.9875 8.69751 14.655 8.85001L2.76248 14.325C2.65498 14.375 2.53748 14.4 2.41998 14.4C1.96748 14.4 1.59998 14.03 1.59998 13.575C1.59998 13.46 1.62498 13.345 1.66998 13.24Z" fill="white"/>
  </svg>
);

export function App() {
  const [state, setState] = useState<OverlayState>({
    sessions: [],
    activeSessionPid: null,
    events: [],
    pendingPermission: null,
    pendingQuestion: null,
    expanded: false,
    sessionStatus: 'unknown',
    approvalMode: 'manual',
    sessionApprovalModes: {},
  });
  const [input, setInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getState().then(setState);
    return api.onStateUpdate(setState);
  }, []);

  useEffect(() => {
    if (state.expanded) {
      setAnimKey(k => k + 1);
      if (!editingName) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.expanded, editingName]);

  useEffect(() => {
    if (editingName) nameRef.current?.focus();
  }, [editingName]);

  // Global shortcuts: Cmd+Enter = allow/submit, Cmd+Backspace = deny/skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (state.pendingPermission) {
          api.respondPermission({ decision: 'allow' });
        } else if (state.pendingQuestion) {
          document.querySelector<HTMLButtonElement>('.question-actions .btn-allow:not(:disabled)')?.click();
        }
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (state.pendingPermission) {
          api.respondPermission({ decision: 'deny' });
        } else if (state.pendingQuestion) {
          api.skipQuestion();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.pendingPermission, state.pendingQuestion]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !state.activeSessionPid) return;
    api.respondText(text, state.activeSessionPid);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') api.togglePanel();
  };

  const activeSession = state.sessions.find(s => s.pid === state.activeSessionPid);

  // Get current session's approval mode
  const activeSessionId = activeSession?.sessionId || '';
  const currentMode: ApprovalMode = (state.sessionApprovalModes?.[activeSessionId] as ApprovalMode) || 'manual';

  const cycleApprovalMode = () => {
    if (!activeSessionId) return;
    const modes: ApprovalMode[] = ['manual', 'allow-session', 'allow-all'];
    const idx = modes.indexOf(currentMode);
    const next = modes[(idx + 1) % modes.length];
    api.setApprovalMode(activeSessionId, next);
  };

  const startRename = () => {
    setNameInput(activeSession?.name || '');
    setEditingName(true);
  };

  const saveRename = () => {
    if (state.activeSessionPid && nameInput.trim()) {
      api.renameSession(state.activeSessionPid, nameInput.trim());
    }
    setEditingName(false);
  };

  const sortedSessions = [...state.sessions];

  const [sessionListOpen, setSessionListOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const toggleSessionList = (open?: boolean) => {
    const next = open !== undefined ? open : !sessionListOpen;
    setSessionListOpen(next);
    if (next) setHistoryOpen(false);
    api.toggleSessionList(next, state.sessions.length);
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next) {
      setSessionListOpen(false);
      api.toggleSessionList(false, 0);
    }
    api.setPanelHeight(next ? 240 : 0);
  };

  const hasPending = !!state.pendingPermission;
  const pendingEvent = state.pendingPermission?.event;

  // For permission card: use the session that triggered the event, falling back to active
  const permissionSession = hasPending
    ? (state.sessions.find(s => s.pid === pendingEvent?.sessionPid) || activeSession)
    : null;
  const sessionLabel = activeSession?.name || activeSession?.cwd.split('/').pop() || '';

  return (
    <div key={animKey} className="command-bar">
      {hasPending ? (
        /* ===== Permission Card ===== */
        <div className="permission-bar">
          {/* Row 1: header with drag+mascot group, session + title */}
          <div className="permission-header">
            <div className="drag-mascot-group">
              <div className="drag-handle"><IconGrid /></div>
              <div className="permission-mascot"><IconMascotDefault /></div>
            </div>
            <div className="permission-title">
              <span className="dot" />
              <span className="permission-session-name">
                {permissionSession?.name || permissionSession?.cwd.split('/').pop() || sessionLabel}
              </span>
              <span className="permission-label">Deseja Permissao para:</span>
            </div>
          </div>

          {/* Row 2: action description */}
          <div className="permission-desc-box">
            {pendingEvent?.description || pendingEvent?.message || 'Acao solicitada'}
          </div>

          {/* Row 3: buttons */}
          <div className="permission-buttons">
            <button className="btn-action btn-allow" onClick={() => api.respondPermission({ decision: 'allow' })}>
              Permitir
              <span className="kbd-group">
                <span className="kbd">{'\u2318'}</span>
                <span className="kbd-plus">+</span>
                <span className="kbd">{'\u21B5'}</span>
              </span>
            </button>
            <button className="btn-action btn-deny" onClick={() => api.respondPermission({ decision: 'deny' })}>
              Nao Permitir
              <span className="kbd-group">
                <span className="kbd">{'\u2318'}</span>
                <span className="kbd-plus">+</span>
                <span className="kbd">{'\u232B'}</span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ===== Normal Input Row ===== */
        <div className="input-row">
          <div className="drag-mascot-group">
            <div className="drag-handle"><IconGrid /></div>
            <MascotButton mode={currentMode} onClick={cycleApprovalMode} />
          </div>

          <button
            className={`btn-box ${historyOpen ? 'active' : ''}`}
            onClick={toggleHistory}
            title="Historico"
          >
            <IconClock />
          </button>

          {state.sessions.length > 0 && (
            <>
              {editingName ? (
                <input
                  ref={nameRef}
                  className="name-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  placeholder="Name..."
                />
              ) : (
                <div className="session-pill" onClick={() => toggleSessionList()} onDoubleClick={startRename}>
                  <span className="dot" />
                  <span className="session-pill-label">{sessionLabel || 'Select'}</span>
                  <span className={`session-pill-arrow ${sessionListOpen ? 'open' : ''}`}>
                    <IconChevron />
                  </span>
                </div>
              )}
            </>
          )}

          <div className="input-wrap">
            <input
              ref={inputRef}
              className="input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={state.activeSessionPid ? 'Enviar para o Claude...' : 'Nenhuma sessao ativa'}
              disabled={!state.activeSessionPid}
            />
          </div>

          <button
            className="btn-send"
            onClick={handleSend}
            disabled={!input.trim() || !state.activeSessionPid}
          >
            <IconSend />
          </button>
        </div>
      )}

      {/* Session list */}
      {sessionListOpen && sortedSessions.length > 0 && (
        <div className="session-list">
          {sortedSessions.map((s) => (
            <button
              key={s.pid}
              className={`session-list-item ${s.pid === state.activeSessionPid ? 'active' : ''}`}
              onClick={() => {
                api.selectSession(s.pid);
                toggleSessionList(false);
              }}
            >
              <span className="dot" />
              <span className="session-list-name">
                {s.name || s.cwd.split('/').pop() || `PID ${s.pid}`}
              </span>
              <span className="session-list-pid">PID {s.pid}</span>
            </button>
          ))}
        </div>
      )}

      {historyOpen && <HistoryPanel events={state.events} />}
      {state.pendingQuestion && <QuestionPanel question={state.pendingQuestion} />}
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'agora';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h`;
}

const EVENT_ICONS: Record<string, string> = {
  tool_use: '\u2699',
  permission_prompt: '\u26A0',
  elicitation_dialog: '\u2753',
  idle_prompt: '\u23F8',
  notification: '\u2139',
  unknown: '\u2022',
};

function HistoryPanel({ events }: { events: OverlayEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="history-panel">
        <div className="history-empty">Nenhum evento ainda</div>
      </div>
    );
  }
  return (
    <div className="history-panel">
      {events.slice(0, 20).map((ev) => (
        <div key={ev.id} className={`history-item history-${ev.type}`}>
          <span className="history-icon">{EVENT_ICONS[ev.type] || '\u2022'}</span>
          <span className="history-tool">{ev.tool || ev.type}</span>
          <span className="history-msg">{ev.message}</span>
          <span className="history-time">{timeAgo(ev.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

function QuestionPanel({ question }: { question: PendingQuestion }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [textInput, setTextInput] = useState('');
  const textRef = useRef<HTMLInputElement>(null);
  const hasOptions = question.options.length > 0;

  useEffect(() => {
    if (!hasOptions) setTimeout(() => textRef.current?.focus(), 100);
  }, [hasOptions]);

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (question.multiSelect) {
        if (next.has(i)) next.delete(i);
        else next.add(i);
      } else {
        next.clear();
        next.add(i);
      }
      return next;
    });
  };

  const submit = () => {
    const api = (window as any).overlayAPI;
    if (hasOptions) {
      const selectedOptions = question.options
        .filter((_, i) => selected.has(i))
        .map(o => o.label);
      api.respondQuestion({ selectedOptions });
    } else {
      api.respondQuestion({ text: textInput.trim() });
    }
  };

  const canSubmit = hasOptions ? selected.size > 0 : textInput.trim().length > 0;

  return (
    <div className="question-panel">
      <div className="question-header">
        <span className="question-dot" />
        <span className="question-title">{question.question}</span>
      </div>
      {hasOptions ? (
        <div className="question-options">
          {question.options.map((opt, i) => (
            <button
              key={i}
              className={`question-option ${selected.has(i) ? 'selected' : ''}`}
              onClick={() => toggle(i)}
            >
              <span className="option-check">
                {selected.has(i) ? (question.multiSelect ? '\u2611' : '\u25C9') : (question.multiSelect ? '\u2610' : '\u25CB')}
              </span>
              <span className="option-content">
                <span className="option-label">{opt.label}</span>
                {opt.description && <span className="option-desc">{opt.description}</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="question-text-input">
          <input
            ref={textRef}
            className="input-field question-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) { e.preventDefault(); submit(); }
            }}
            placeholder="Digite sua resposta..."
          />
        </div>
      )}
      <div className="question-actions">
        <button className="btn-action btn-allow" onClick={submit} disabled={!canSubmit}>
          Enviar
        </button>
        <button className="btn-action btn-deny" onClick={() => (window as any).overlayAPI.skipQuestion()}>
          Pular
        </button>
      </div>
    </div>
  );
}
