import { useState, useRef, useEffect } from 'react';
import type { OverlayState, PermissionDecision } from '../shared/types';
import { SessionSelector } from './SessionSelector';
import { QuickActions } from './QuickActions';

interface Props {
  state: OverlayState;
  onClose: () => void;
  onPermissionRespond: (decision: PermissionDecision) => void;
  onTextRespond: (text: string) => void;
  onSelectSession: (pid: number) => void;
}

export function MiniPanel({ state, onClose, onPermissionRespond, onTextRespond, onSelectSession }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [state.expanded]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onTextRespond(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mini-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">Claude Overlay</div>
        <button className="btn-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Session selector */}
      <SessionSelector
        sessions={state.sessions}
        activePid={state.activeSessionPid}
        onSelect={onSelectSession}
      />

      {/* Permission prompt */}
      {state.pendingPermission && (
        <QuickActions
          event={state.pendingPermission.event}
          onRespond={onPermissionRespond}
        />
      )}

      {/* Event log */}
      <div className="event-log">
        {state.events.length === 0 ? (
          <div className="empty-state">
            Waiting for Claude events...
          </div>
        ) : (
          state.events.slice(0, 20).map((event) => (
            <div key={event.id} className={`event-item event-${event.type}`}>
              <div className="event-type">{event.type.replace('_', ' ')}</div>
              <div className="event-message">{event.message}</div>
              <div className="event-time">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Text input */}
      <div className="input-bar">
        <textarea
          ref={inputRef}
          className="text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            state.activeSessionPid
              ? 'Type a message...'
              : 'No active session'
          }
          disabled={!state.activeSessionPid}
          rows={2}
        />
        <button
          className="btn btn-send"
          onClick={handleSend}
          disabled={!input.trim() || !state.activeSessionPid}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
