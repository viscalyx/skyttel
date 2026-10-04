import { useEffect, useId, useRef, useState } from 'react';

export function ContextMeter({ percentage = 0 }: { percentage?: number }) {
  const id = useId();
  return (
    <div className="conversation-context-meter">
      <label htmlFor={`${id}-meter`}>Kontext</label>
      <meter
        id={`${id}-meter`}
        min={0}
        max={100}
        low={60}
        high={85}
        optimum={0}
        value={percentage}
        aria-valuetext={`${percentage} procent`}
        aria-describedby={`${id}-description`}
      />
      <span aria-hidden="true">{percentage}%</span>
      <p id={`${id}-description`} className="visually-hidden">
        Så mycket av samtalets kontext som är fylld. Nytt samtal tömmer den.
      </p>
    </div>
  );
}

export function ContextSymbol({ percentage }: { percentage: number }) {
  if (percentage < 85) return null;
  return (
    <span
      role="img"
      className="voice-context"
      aria-label={`Kontexten är ${percentage} procent full`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle className="voice-context-ring" cx="12" cy="12" r="9" />
        <circle
          className="voice-context-fill"
          cx="12"
          cy="12"
          r="9"
          pathLength="100"
          strokeDasharray={`${percentage} 100`}
        />
      </svg>
      <span aria-hidden="true">{percentage}%</span>
    </span>
  );
}

/** Kept outside the changing status word and the optional visible voice box. */
export function ContextAnnouncement({
  percentage,
  visible,
  conversationKey,
}: {
  percentage: number;
  visible: boolean;
  conversationKey: string;
}) {
  const before = useRef(conversationKey);
  const announced = useRef(false);
  const [text, setText] = useState('');
  useEffect(() => {
    if (before.current !== conversationKey) {
      before.current = conversationKey;
      announced.current = false;
      setText('');
    }
    if (visible && percentage >= 85 && !announced.current) {
      announced.current = true;
      setText('Kontexten är 85 procent full');
    }
  }, [percentage, visible, conversationKey]);
  return (
    <p
      className="voice-announcement voice-context-announcement"
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </p>
  );
}
