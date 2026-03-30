import type { PermissionDecision, OverlayEvent } from '../shared/types';

interface Props {
  event: OverlayEvent;
  onRespond: (decision: PermissionDecision) => void;
}

export function QuickActions({ event, onRespond }: Props) {
  return (
    <div className="quick-actions">
      <div className="permission-info">
        <div className="permission-label">Needs approval</div>
        <div className="permission-tool">{event.tool || 'Unknown tool'}</div>
        <div className="permission-message">{event.message}</div>
      </div>
      <div className="permission-buttons">
        <button
          className="btn btn-allow"
          onClick={() => onRespond({ decision: 'allow' })}
        >
          Allow
        </button>
        <button
          className="btn btn-deny"
          onClick={() => onRespond({ decision: 'deny' })}
        >
          Deny
        </button>
      </div>
    </div>
  );
}
