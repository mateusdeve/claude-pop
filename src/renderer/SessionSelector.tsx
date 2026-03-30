import type { ClaudeSession } from '../shared/types';

interface Props {
  sessions: ClaudeSession[];
  activePid: number | null;
  onSelect: (pid: number) => void;
}

export function SessionSelector({ sessions, activePid, onSelect }: Props) {
  if (sessions.length === 0) {
    return <div className="session-selector empty">No active sessions</div>;
  }

  return (
    <select
      className="session-selector"
      value={activePid ?? ''}
      onChange={(e) => onSelect(Number(e.target.value))}
    >
      {sessions.map((s) => (
        <option key={s.pid} value={s.pid}>
          PID {s.pid} - {s.cwd.split('/').pop() || s.cwd}
        </option>
      ))}
    </select>
  );
}
