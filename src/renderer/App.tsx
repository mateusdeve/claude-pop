import { useState, useEffect, useRef } from 'react';
import type { OverlayState, PermissionDecision, PendingQuestion, SessionStatus, OverlayEvent, ApprovalMode } from '../shared/types';

const api = (window as any).overlayAPI;

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
          // Let QuestionPanel handle via its own submit
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

  const sortedSessions = [...state.sessions].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return 0;
  });

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

  return (
    <div key={animKey} className="command-bar">
      {/* Input row */}
      <div className="input-row">
        <div className="claude-icon-wrap">
          <div className="claude-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fillRule="nonzero" />
            </svg>
          </div>
          <span className={`status-dot status-${state.sessionStatus}`} />
        </div>

        <input
          ref={inputRef}
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={state.activeSessionPid ? 'Enviar para o Claude...' : 'Nenhuma sessão ativa'}
          disabled={!state.activeSessionPid}
        />

        {state.sessions.length > 0 && (
          <div className="session-controls">
            <button
              className={`btn-icon ${activeSession?.isFavorite ? 'active' : ''}`}
              onClick={() => state.activeSessionPid && api.toggleFavorite(state.activeSessionPid)}
            >
              {activeSession?.isFavorite ? '\u2605' : '\u2606'}
            </button>

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
                <span className="session-pill-label">
                  {activeSession?.isFavorite ? '\u2605 ' : ''}{activeSession?.name || activeSession?.cwd.split('/').pop() || 'Select'}
                </span>
                <span className={`session-pill-arrow ${sessionListOpen ? 'open' : ''}`}>&#9662;</span>
              </div>
            )}
          </div>
        )}

        <button
          className={`btn-icon btn-approval ${state.approvalMode !== 'manual' ? 'active' : ''}`}
          onClick={() => {
            const modes: ApprovalMode[] = ['manual', 'allow-all', 'allow-session'];
            const idx = modes.indexOf(state.approvalMode);
            const next = modes[(idx + 1) % modes.length];
            api.setApprovalMode(next);
          }}
          title={
            state.approvalMode === 'manual' ? 'Manual — clique para aceitar tudo'
            : state.approvalMode === 'allow-all' ? 'Aceitando tudo — clique para aceitar sessão'
            : 'Aceitando sessão — clique para manual'
          }
        >
          {state.approvalMode === 'manual' ? '\u{1F6E1}' : state.approvalMode === 'allow-all' ? '\u2705' : '\u{1F4CC}'}
        </button>

        <button
          className={`btn-icon btn-history ${historyOpen ? 'active' : ''}`}
          onClick={toggleHistory}
          title="Histórico"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!input.trim() || !state.activeSessionPid}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Permission prompt */}
      {hasPending && (
        <div className="permission-bar">
          <div className="permission-info">
            <span className="permission-dot" />
            <span className="permission-tool">{pendingEvent?.tool || 'Ação'}</span>
            <span className="permission-desc">{pendingEvent?.message}</span>
          </div>
          <div className="permission-actions">
            <button className="btn-action btn-allow" onClick={() => api.respondPermission({ decision: 'allow' })} title="⌘ Enter">
              Permitir
            </button>
            <button className="btn-action btn-deny" onClick={() => api.respondPermission({ decision: 'deny' })} title="⌘ ⌫">
              Negar
            </button>
          </div>
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
                {s.isFavorite ? '\u2605 ' : ''}{s.name || s.cwd.split('/').pop() || `PID ${s.pid}`}
              </span>
              <span className="session-list-pid">PID {s.pid}</span>
            </button>
          ))}
        </div>
      )}

      {/* History panel */}
      {historyOpen && (
        <HistoryPanel events={state.events} />
      )}

      {/* Question dialog - multi-select / single-select */}
      {state.pendingQuestion && (
        <QuestionPanel question={state.pendingQuestion} />
      )}
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
  tool_use: '\u2699',        // ⚙
  permission_prompt: '\u26A0', // ⚠
  elicitation_dialog: '\u2753', // ❓
  idle_prompt: '\u23F8',      // ⏸
  notification: '\u2139',     // ℹ
  unknown: '\u2022',          // •
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
        <button className="btn-action btn-allow" onClick={submit} disabled={!canSubmit} title="⌘ Enter">
          Enviar
        </button>
        <button className="btn-action btn-deny" onClick={() => (window as any).overlayAPI.skipQuestion()} title="⌘ ⌫">
          Pular
        </button>
      </div>
    </div>
  );
}
