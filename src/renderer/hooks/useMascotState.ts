import { useState, useRef, useCallback, useEffect } from 'react';
import type { LogoState } from '../components/LogoLottie';
import type { SessionStatus } from '../../shared/types';

export function useMascotState(sessionStatus: SessionStatus) {
  const [state, setState] = useState<LogoState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Map session status to mascot state
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    switch (sessionStatus) {
      case 'working':
        setState('thinking');
        break;
      case 'waiting':
        setState('idle');
        break;
      case 'idle':
        setState('idle');
        break;
      default:
        setState('idle');
    }
  }, [sessionStatus]);

  const onSuccess = useCallback(() => {
    setState('success');
    timer.current = setTimeout(() => setState('idle'), 3000);
  }, []);

  const onError = useCallback(() => {
    setState('error');
    timer.current = setTimeout(() => setState('idle'), 2500);
  }, []);

  return { mascotState: state, onSuccess, onError };
}
