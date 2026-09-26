import type { ReactNode, Ref } from 'react';
import { Brand } from './VisualPrototype.js';

export function VisualPrototypeDFrame({
  expanded,
  detailOpen = false,
  actions,
  footer,
  status,
  map,
  children,
  className = '',
  context,
  statusRef,
  frameRef,
}: {
  expanded: boolean;
  detailOpen?: boolean;
  actions: ReactNode;
  footer: ReactNode;
  status: ReactNode;
  map: ReactNode;
  children?: ReactNode;
  className?: string;
  context?: ReactNode;
  statusRef?: Ref<HTMLDivElement>;
  frameRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={frameRef}
      className={`vp-app vp-app-D${expanded ? ' vp-d-expanded' : ''}${detailOpen ? ' vp-d-detail-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <nav className="vp-d-toolbox" aria-label="Kartans verktyg" id="np-tools">
        <div className="vp-d-brand">
          <Brand />
        </div>
        <div className="vp-d-actions">{actions}</div>
        <div className="vp-d-toolbox-footer">{footer}</div>
      </nav>
      <div className="vp-d-context" style={{ zIndex: 1 }}>
        {context ?? (
          <>
            <span className="vp-d-context-dot" />
            Hushållet Lind<span>Gemensam karta</span>
          </>
        )}
      </div>
      <div ref={statusRef} className="vp-d-status">
        {status}
      </div>
      {map}
      {children}
    </div>
  );
}
