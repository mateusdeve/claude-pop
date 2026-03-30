import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { useEffect, useRef } from 'react';
import loudspeakerData from '../assets/loudspeaker.json';

export type LogoState = 'idle' | 'thinking' | 'success' | 'error';

interface Props {
  state: LogoState;
  size?: number;
}

const SEGMENTS: Record<LogoState, [number, number]> = {
  idle:     [0,   180],
  thinking: [0,    80],
  success:  [160, 321],
  error:    [70,  130],
};

const SPEEDS: Record<LogoState, number> = {
  idle:     1,
  thinking: 0.5,
  success:  1.6,
  error:    0.45,
};

const LOOPS: Record<LogoState, boolean> = {
  idle:     true,
  thinking: true,
  success:  false,
  error:    false,
};

export function LogoLottie({ state, size = 52 }: Props) {
  const ref = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.setSpeed(SPEEDS[state]);
    ref.current.playSegments(SEGMENTS[state], true);
  }, [state]);

  return (
    <Lottie
      lottieRef={ref}
      animationData={loudspeakerData}
      loop={LOOPS[state]}
      autoplay
      style={{ width: size, height: size }}
    />
  );
}
