import { useState, useEffect, useRef } from 'react';
import type { OverlayState, PermissionDecision, PendingQuestion, SessionStatus, OverlayEvent, ApprovalMode, ConversationMessage, SlashCommand } from '../shared/types';

const api = (window as any).overlayAPI;

/* ===== Figma SVG Icons ===== */

const IconGrid = () => (
  <svg width="6" height="12" viewBox="0 0 6 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0.9525 1.305C1.1475 1.305 1.305 1.1475 1.305 0.9525C1.305 0.7575 1.1475 0.6 0.9525 0.6C0.7575 0.6 0.6 0.7575 0.6 0.9525C0.6 1.1475 0.7575 1.305 0.9525 1.305ZM1.905 0.9525C1.905 1.4775 1.4775 1.905 0.9525 1.905C0.4275 1.905 0 1.4775 0 0.9525C0 0.4275 0.4275 0 0.9525 0C1.4775 0 1.905 0.4275 1.905 0.9525ZM4.0575 1.305C4.2525 1.305 4.41 1.1475 4.41 0.9525C4.41 0.7575 4.2525 0.6 4.0575 0.6C3.8625 0.6 3.705 0.7575 3.705 0.9525C3.705 1.1475 3.8625 1.305 4.0575 1.305ZM5.01 0.9525C5.01 1.4775 4.5825 1.905 4.0575 1.905C3.5325 1.905 3.105 1.4775 3.105 0.9525C3.105 0.4275 3.5325 0 4.0575 0C4.5825 0 5.01 0.4275 5.01 0.9525ZM0.6 4.055C0.6 4.25 0.7575 4.4075 0.9525 4.4075C1.1475 4.4075 1.305 4.25 1.305 4.055C1.305 3.86 1.1475 3.7025 0.9525 3.7025C0.7575 3.7025 0.6 3.86 0.6 4.055ZM0.9525 5.0075C0.4275 5.0075 0 4.58 0 4.055C0 3.53 0.4275 3.1025 0.9525 3.1025C1.4775 3.1025 1.905 3.53 1.905 4.055C1.905 4.58 1.4775 5.0075 0.9525 5.0075ZM4.0575 4.4075C4.2525 4.4075 4.41 4.25 4.41 4.055C4.41 3.86 4.2525 3.7025 4.0575 3.7025C3.8625 3.7025 3.705 3.86 3.705 4.055C3.705 4.25 3.8625 4.4075 4.0575 4.4075ZM5.01 4.055C5.01 4.58 4.5825 5.0075 4.0575 5.0075C3.5325 5.0075 3.105 4.58 3.105 4.055C3.105 3.53 3.5325 3.1025 4.0575 3.1025C4.5825 3.1025 5.01 3.53 5.01 4.055ZM0.6 7.145C0.6 7.34 0.7575 7.4975 0.9525 7.4975C1.1475 7.4975 1.305 7.34 1.305 7.145C1.305 6.95 1.1475 6.7925 0.9525 6.7925C0.7575 6.7925 0.6 6.95 0.6 7.145ZM0.9525 8.0975C0.4275 8.0975 0 7.67 0 7.145C0 6.62 0.4275 6.1925 0.9525 6.1925C1.4775 6.1925 1.905 6.62 1.905 7.145C1.905 7.67 1.4775 8.0975 0.9525 8.0975ZM4.0575 7.4975C4.2525 7.4975 4.41 7.34 4.41 7.145C4.41 6.95 4.2525 6.7925 4.0575 6.7925C3.8625 6.7925 3.705 6.95 3.705 7.145C3.705 7.34 3.8625 7.4975 4.0575 7.4975ZM5.01 7.145C5.01 7.67 4.5825 8.0975 4.0575 8.0975C3.5325 8.0975 3.105 7.67 3.105 7.145C3.105 6.62 3.5325 6.1925 4.0575 6.1925C4.5825 6.1925 5.01 6.62 5.01 7.145ZM0.6 10.2475C0.6 10.4425 0.7575 10.6 0.9525 10.6C1.1475 10.6 1.305 10.4425 1.305 10.2475C1.305 10.0525 1.1475 9.895 0.9525 9.895C0.7575 9.895 0.6 10.0525 0.6 10.2475ZM0.9525 11.2C0.4275 11.2 0 10.7725 0 10.2475C0 9.7225 0.4275 9.295 0.9525 9.295C1.4775 9.295 1.905 9.7225 1.905 10.2475C1.905 10.7725 1.4775 11.2 0.9525 11.2ZM4.0575 10.6C4.2525 10.6 4.41 10.4425 4.41 10.2475C4.41 10.0525 4.2525 9.895 4.0575 9.895C3.8625 9.895 3.705 10.0525 3.705 10.2475C3.705 10.4425 3.8625 10.6 4.0575 10.6ZM5.01 10.2475C5.01 10.7725 4.5825 11.2 4.0575 11.2C3.5325 11.2 3.105 10.7725 3.105 10.2475C3.105 9.7225 3.5325 9.295 4.0575 9.295C4.5825 9.295 5.01 9.7225 5.01 10.2475Z" fill="#525252"/>
  </svg>
);

/* Mascot SVG frames — color changes by approval mode, animates when working */
const MASCOT_COLORS: Record<ApprovalMode, string> = {
  'manual': '#737373',
  'allow-session': '#FF809D',
  'allow-all': '#FF1A4F',
};

const MascotFrame1 = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.6318 5.05273H10.1055V7.5791H12.6318V5.05273H15.1582V10.1055H12.6318V12.6318H7.5791V15.1582H5.05273V12.6318H2.52637V10.1055H0V5.05273H2.52637V2.52637H12.6318V5.05273ZM15.1582 15.1582H12.6318V12.6318H15.1582V15.1582ZM5.05273 7.5791H7.5791V5.05273H5.05273V7.5791ZM2.52637 2.52637H0V0H2.52637V2.52637Z" fill={color}/>
  </svg>
);

const MascotFrame2 = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.52637 15.1582H0V12.6318H2.52637V15.1582ZM12.6318 5.05273H10.1055V7.5791H12.6318V5.05273H15.1582V10.1055H12.6318V12.6318H7.5791V15.1582H5.05273V12.6318H2.52637V10.1055H0V5.05273H2.52637V2.52637H12.6318V5.05273ZM5.05273 7.5791H7.5791V5.05273H5.05273V7.5791ZM15.1582 2.52637H12.6318V0H15.1582V2.52637Z" fill={color}/>
  </svg>
);

const MascotButton = ({ mode, isWorking, onClick }: { mode: ApprovalMode; isWorking: boolean; onClick: () => void }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isWorking) { setFrame(0); return; }
    const id = setInterval(() => setFrame(f => (f + 1) % 2), 600);
    return () => clearInterval(id);
  }, [isWorking]);

  const titles: Record<ApprovalMode, string> = {
    'manual': 'Manual — pedir permissao para tudo',
    'allow-session': 'Accept edits — auto-aprova leitura/escrita',
    'allow-all': 'Bypass — auto-aprova tudo nesta sessao',
  };
  const color = MASCOT_COLORS[mode];
  return (
    <button className="mascot-btn" onClick={onClick} title={titles[mode]}>
      {frame === 0 ? <MascotFrame1 color={color} /> : <MascotFrame2 color={color} />}
    </button>
  );
};


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

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.4 2.4H13.6C14.04 2.4 14.4 2.76 14.4 3.2V10.4C14.4 10.84 14.04 11.2 13.6 11.2H4.4L1.6 14V3.2C1.6 2.76 1.96 2.4 2.4 2.4ZM4.8 5.6H11.2V6.4H4.8V5.6ZM4.8 7.6H9.6V8.4H4.8V7.6Z" fill="white"/>
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
  const [dragOver, setDragOver] = useState(false);
  const [attachedImages, setAttachedImages] = useState<{ base64: string; name: string }[]>([]);
  const [commands, setCommands] = useState<SlashCommand[]>([]);
  const [slashIndex, setSlashIndex] = useState(0);
  const [savedSessions, setSavedSessions] = useState<{ sessionId: string; name: string; cwd: string; savedAt: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const expandedInputRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const lastCmdPidRef = useRef<number | null>(null);
  useEffect(() => {
    api.getState().then(setState);
    api.getSavedSessions().then(setSavedSessions);
    return api.onStateUpdate(setState);
  }, []);

  // Reload commands when active session changes
  useEffect(() => {
    if (state.activeSessionPid && state.activeSessionPid !== lastCmdPidRef.current) {
      lastCmdPidRef.current = state.activeSessionPid;
      api.getCommands().then(setCommands);
    }
  }, [state.activeSessionPid]);

  const convOpenRef = useRef(false);

  useEffect(() => {
    api.getConversation().then((msgs: ConversationMessage[]) => {
      setConversation(msgs);
      prevConvLenRef.current = msgs.length;
    });
    return api.onConversationUpdate((msgs: ConversationMessage[]) => {
      setConversation(msgs);
      if (msgs.length > prevConvLenRef.current && !convOpenRef.current) {
        setConvUnread(true);
      }
      prevConvLenRef.current = msgs.length;
    });
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

  // Auto-focus expanded input when it appears, and move cursor to end
  const isExpanded = input.length > 30;
  useEffect(() => {
    if (isExpanded && expandedInputRef.current) {
      expandedInputRef.current.focus();
      const len = expandedInputRef.current.value.length;
      expandedInputRef.current.setSelectionRange(len, len);
    }
  }, [isExpanded]);

  // Report actual content height to main process
  useEffect(() => {
    if (!barRef.current) return;
    let lastH = 0;
    const report = () => {
      if (!barRef.current) return;
      const h = barRef.current.scrollHeight;
      if (h > 0 && h !== lastH) {
        lastH = h;
        api.reportContentHeight(h + 2); // +2 for border
      }
    };
    const observer = new MutationObserver(report);
    observer.observe(barRef.current, { childList: true, subtree: true, attributes: true, characterData: true });
    const resizeObs = new ResizeObserver(report);
    resizeObs.observe(barRef.current);
    report();
    return () => { observer.disconnect(); resizeObs.disconnect(); };
  }, [animKey]);

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
        } else if (input.trim()) {
          handleSend();
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
    if ((!text && attachedImages.length === 0) || !state.activeSessionPid) return;
    if (attachedImages.length > 0) {
      api.sendWithImage(text, attachedImages, state.activeSessionPid);
      setAttachedImages([]);
    } else {
      api.respondText(text, state.activeSessionPid);
    }
    setInput('');
  };

  // Slash command autocomplete
  const showSlash = input.startsWith('/') && input.indexOf(' ') === -1;
  const filteredCommands = showSlash
    ? commands.filter(c => `/${c.name}`.toLowerCase().includes(input.toLowerCase())).slice(0, 8)
    : [];

  const selectSlashCommand = (cmd: SlashCommand) => {
    setInput(`/${cmd.name} `);
    setSlashIndex(0);
    setTimeout(() => {
      inputRef.current?.focus();
      expandedInputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredCommands.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); selectSlashCommand(filteredCommands[slashIndex]); return; }
      if (e.key === 'Tab') { e.preventDefault(); selectSlashCommand(filteredCommands[slashIndex]); return; }
      if (e.key === 'Escape') { setInput(''); return; }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      if (e.key === 'Escape') api.togglePanel();
    }
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
  const [conversationOpen, setConversationOpen] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [convUnread, setConvUnread] = useState(false);
  const prevConvLenRef = useRef(0);

  const toggleSessionList = (open?: boolean) => {
    const next = open !== undefined ? open : !sessionListOpen;
    setSessionListOpen(next);
    if (next) { setConversationOpen(false); }
    api.toggleSessionList(next, state.sessions.length);
  };

  const toggleConversation = () => {
    const next = !conversationOpen;
    setConversationOpen(next);
    convOpenRef.current = next;
    if (next) {
      setConvUnread(false);
      setSessionListOpen(false);
      api.toggleSessionList(false, 0);
    }
    api.setPanelHeight(next ? 300 : 0);
  };

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f => ALLOWED_TYPES.includes(f.type));
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImages(prev => [...prev, { base64: reader.result as string, name: file.name }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const hasPending = !!state.pendingPermission;
  const pendingEvent = state.pendingPermission?.event;

  // For permission card: use the session that triggered the event, falling back to active
  const permissionSession = hasPending
    ? (state.sessions.find(s => s.pid === pendingEvent?.sessionPid) || activeSession)
    : null;
  const sessionLabel = activeSession?.name || activeSession?.cwd.split('/').pop() || '';

  return (
    <div
      key={animKey}
      ref={barRef}
      className={`command-bar ${dragOver ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {hasPending ? (
        /* ===== Permission Card ===== */
        <div className="permission-bar">
          {/* Row 1: header with drag+mascot group, session + title */}
          <div className="permission-header">
            <div className="drag-mascot-group">
              <div className="drag-handle"><IconGrid /></div>
              <div className="permission-mascot"><MascotFrame1 color={MASCOT_COLORS[currentMode]} /></div>
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
            <MascotButton mode={currentMode} isWorking={state.sessionStatus === 'working'} onClick={cycleApprovalMode} />
          </div>

          <button
            className={`btn-box ${conversationOpen ? 'active' : ''}`}
            onClick={toggleConversation}
            title="Conversa"
          >
            <IconChat />
            {convUnread && <span className="conv-unread-dot" />}
            {!convUnread && conversation.length > 0 && conversation[conversation.length - 1].role === 'assistant' && conversation[conversation.length - 1].isComplete && (
              <span className="conv-done-dot" />
            )}
          </button>

          {state.sessions.length > 0 ? (
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

              {!isExpanded ? (
                <>
                  <div className="input-wrap">
                    <textarea
                      ref={inputRef}
                      className="input-field"
                      value={input}
                      onChange={(e) => { setInput(e.target.value); setSlashIndex(0); }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enviar para o Claude..."
                      disabled={!state.activeSessionPid}
                      rows={1}
                    />
                  </div>
                </>
              ) : (
                <div className="expanded-bar-hint">
                  <span className="kbd-group">
                    <span className="kbd">{'\u2318'}</span>
                    <span className="kbd-plus">+</span>
                    <span className="kbd">{'\u21B5'}</span>
                  </span>
                  <span className="send-hint-label">Para enviar</span>
                </div>
              )}

              <button
                className="btn-send"
                onClick={handleSend}
                disabled={(!input.trim() && attachedImages.length === 0) || !state.activeSessionPid}
              >
                <IconSend />
              </button>
            </>
          ) : (
            <button className="session-pill session-new-pill" onClick={() => api.newSession()}>
              <span className="new-session-icon">+</span>
              <span className="session-pill-label">Nova sessao</span>
            </button>
          )}
        </div>
      )}

      {/* Slash command autocomplete */}
      {filteredCommands.length > 0 && (
        <div className="slash-dropdown">
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.name}
              className={`slash-item ${i === slashIndex ? 'active' : ''}`}
              onClick={() => selectSlashCommand(cmd)}
              onMouseEnter={() => setSlashIndex(i)}
            >
              <span className="slash-name">/{cmd.name}</span>
              <span className="slash-desc">{cmd.description}</span>
              {cmd.scope !== 'plugin' && <span className="slash-scope">({cmd.scope})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Image preview */}
      {attachedImages.length > 0 && (
        <div className="image-preview">
          {attachedImages.map((img, i) => (
            <div key={i} className="image-thumb-wrap">
              <img className="image-thumb" src={img.base64} alt="" />
              <button className="image-remove" onClick={() => setAttachedImages(prev => prev.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Expanded input panel */}
      {isExpanded && (
        <div className="expanded-input-panel">
          <div className="expanded-input-wrap">
            <textarea
              ref={expandedInputRef}
              className="expanded-input-field"
              value={input}
              onChange={(e) => { setInput(e.target.value); setSlashIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Enviar para o Claude..."
              disabled={!state.activeSessionPid}
              rows={Math.min(Math.max(2, Math.ceil(input.length / 60)), 6)}
            />
          </div>
        </div>
      )}

      {/* Session list */}
      {sessionListOpen && (
        <div className="session-list">
          {sortedSessions.map((s) => (
            <div key={s.pid} className={`session-list-item ${s.pid === state.activeSessionPid ? 'active' : ''}`}>
              <button
                className="session-list-btn"
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
              <button
                className="session-save-btn"
                title="Salvar para resume"
                onClick={(e) => {
                  e.stopPropagation();
                  api.saveSession(s.sessionId, s.name || s.cwd.split('/').pop() || '', s.cwd);
                  api.getSavedSessions().then(setSavedSessions);
                }}
              >
                💾
              </button>
            </div>
          ))}

          {/* Saved sessions */}
          {savedSessions.length > 0 && (
            <>
              <div className="session-list-divider">Sessoes salvas</div>
              {savedSessions.map((s) => (
                <div key={s.sessionId} className="session-list-item saved">
                  <button
                    className="session-list-btn"
                    onClick={() => {
                      api.resumeSession(s.sessionId, s.cwd);
                      toggleSessionList(false);
                    }}
                  >
                    <span className="dot saved-dot" />
                    <span className="session-list-name">{s.name || s.cwd.split('/').pop()}</span>
                    <span className="session-list-pid">{s.sessionId.slice(0, 8)}</span>
                  </button>
                  <button
                    className="session-remove-btn"
                    title="Remover"
                    onClick={(e) => {
                      e.stopPropagation();
                      api.removeSavedSession(s.sessionId);
                      setSavedSessions(prev => prev.filter(x => x.sessionId !== s.sessionId));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </>
          )}

          <button
            className="session-list-item session-new"
            onClick={() => { api.newSession(); toggleSessionList(false); }}
          >
            <span className="new-session-icon">+</span>
            <span className="session-list-name">Nova sessao</span>
          </button>
        </div>
      )}

      {conversationOpen && <ConversationPanel messages={conversation} status={state.sessionStatus} />}
      {state.pendingQuestion && <QuestionPanel question={state.pendingQuestion} />}
    </div>
  );
}

/** Render inline markdown: **bold**, *italic*, `code`, ~~strike~~ */
function renderMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Combined regex: code backticks first (highest priority), then bold, strikethrough, italic
  const re = /`([^`]+)`|\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(<code key={key++} className="conv-code">{match[1]}</code>);
    } else if (match[2] !== undefined) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<s key={key++}>{match[3]}</s>);
    } else if (match[4] !== undefined) {
      parts.push(<em key={key++}>{match[4]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : [text];
}

function ConversationPanel({ messages, status }: { messages: ConversationMessage[]; status: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="conversation-panel">
        <div className="conv-empty">Nenhuma mensagem ainda</div>
      </div>
    );
  }

  const lastMsg = messages[messages.length - 1];
  const isTyping = lastMsg.role === 'assistant' && !lastMsg.isComplete;

  return (
    <div className="conversation-panel" ref={scrollRef}>
      {messages.map((msg, i) => (
        <div key={i} className={`conv-message conv-${msg.role}`}>
          <div className="conv-bubble">
            <span className="conv-text">{msg.text ? renderMarkdown(msg.text) : (msg.tools ? '' : '...')}</span>
            {msg.tools && msg.tools.length > 0 && (
              <span className="conv-tools">{msg.tools.join(', ')}</span>
            )}
          </div>
        </div>
      ))}
      {isTyping && (
        <div className="conv-message conv-assistant">
          <div className="conv-typing">
            <span className="conv-typing-dot" />
            <span className="conv-typing-dot" />
            <span className="conv-typing-dot" />
          </div>
        </div>
      )}
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
