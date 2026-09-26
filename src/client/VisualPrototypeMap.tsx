import type { CSSProperties, ReactNode } from 'react';
import './visual-prototype-map.css';

// Tillfällig visuell skiss: tre kartkompositioner utan 3D-motor eller sparat tillstånd.
type Variant = 'A' | 'B' | 'C';
type Point = readonly [number, number];
type ObjectKey = 'alex' | 'lo' | 'music' | 'subscription' | 'account' | 'email' | 'bank' | 'card';

const objects: { id: ObjectKey; name: string; type: string; icon: ReactNode }[] = [
  { id: 'alex', name: 'Alex', type: 'Person', icon: 'A' },
  { id: 'lo', name: 'Lo', type: 'Person', icon: 'L' },
  {
    id: 'music',
    name: 'Musikgläntan',
    type: 'Musiktjänst',
    icon: (
      <path d="M9 17V5l10-2v12M9 8l10-2M9 17c0 1.7-1.8 3-4 3s-3-1.3-3-3 1.8-3 4-3c1.2 0 2.2.3 3 1m10 0c0 1.7-1.8 3-4 3s-3-1.3-3-3 1.8-3 4-3c1.2 0 2.2.3 3 1" />
    ),
  },
  {
    id: 'subscription',
    name: 'Familjeabonnemang',
    type: 'Abonnemang',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
        <path d="M8 2v6m8-6v6M4 11h16m-11 4h6m-6 3h4" />
      </>
    ),
  },
  {
    id: 'account',
    name: 'Alex musikkonto',
    type: 'Tjänstekonto',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="2" />
        <path d="M5 17a4 4 0 0 1 8 0m3-8h2m-2 4h2" />
      </>
    ),
  },
  {
    id: 'email',
    name: 'alex@example.test',
    type: 'E-postadress',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
  },
  {
    id: 'bank',
    name: 'Gemensamt bankkonto',
    type: 'Bankkonto',
    icon: <path d="m3 8 9-5 9 5H3zm3 4v6m6-6v6m6-6v6M3 21h18" />,
  },
  {
    id: 'card',
    name: 'Kort ·· 4242',
    type: 'Betalkort',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M2 10h20M6 15h4" />
      </>
    ),
  },
];

const positions: Record<Variant, Record<ObjectKey, Point>> = {
  A: {
    alex: [25, 20],
    lo: [78, 15],
    music: [76, 37],
    subscription: [48, 48],
    account: [20, 52],
    email: [20, 82],
    bank: [63, 78],
    card: [86, 67],
  },
  B: {
    alex: [22, 19],
    lo: [76, 14],
    music: [73, 36],
    subscription: [44, 47],
    account: [17, 50],
    email: [23, 81],
    bank: [63, 79],
    card: [87, 66],
  },
  C: {
    alex: [24, 18],
    lo: [79, 15],
    music: [76, 36],
    subscription: [48, 47],
    account: [18, 49],
    email: [22, 82],
    bank: [64, 80],
    card: [85, 65],
  },
};

const compactPositions: Record<ObjectKey, Point> = {
  alex: [23, 12],
  lo: [77, 12],
  music: [77, 35],
  subscription: [51, 62],
  account: [23, 35],
  email: [23, 74],
  bank: [51, 89],
  card: [75, 92],
};

const connections: {
  from: ObjectKey;
  to: ObjectKey;
  label: string;
  at: Point;
  compactAt: Point;
  secondary?: boolean;
  emphasis?: boolean;
}[] = [
  {
    from: 'alex',
    to: 'subscription',
    label: 'står på avtalet',
    at: [38, 32],
    compactAt: [38, 45],
    emphasis: true,
  },
  { from: 'lo', to: 'music', label: 'använder', at: [77, 25], compactAt: [78, 24] },
  {
    from: 'music',
    to: 'subscription',
    label: 'ger tillgång till',
    at: [65, 43],
    compactAt: [75, 48],
    emphasis: true,
  },
  {
    from: 'subscription',
    to: 'bank',
    label: 'betalas från',
    at: [56, 62],
    compactAt: [51, 78],
    emphasis: true,
  },
  {
    from: 'account',
    to: 'music',
    label: 'hör till',
    at: [47, 35],
    compactAt: [50, 30],
    secondary: true,
  },
  {
    from: 'alex',
    to: 'account',
    label: 'använder',
    at: [21, 36],
    compactAt: [22, 19],
    secondary: true,
  },
  {
    from: 'email',
    to: 'account',
    label: 'inloggningsadress',
    at: [20, 68],
    compactAt: [21, 56],
    secondary: true,
  },
  {
    from: 'card',
    to: 'bank',
    label: 'kopplat till',
    at: [78, 74],
    compactAt: [77, 84],
    secondary: true,
  },
];

function positionStyle(point: Point, compact: Point): CSSProperties {
  return {
    '--vp-x': `${point[0]}%`,
    '--vp-y': `${point[1]}%`,
    '--vp-compact-x': `${compact[0]}%`,
    '--vp-compact-y': `${compact[1]}%`,
  } as CSSProperties;
}

function Connections({
  points,
  compact = false,
}: {
  points: Record<ObjectKey, Point>;
  compact?: boolean;
}) {
  return (
    <svg
      className={`vp-map-connections${compact ? ' vp-map-connections-compact' : ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {connections.map(({ from, to, emphasis }) => {
        if (compact && (from === 'email' || from === 'card')) return null;
        const start = points[from];
        const end = points[to];
        const bend = from === 'account' && to === 'music' ? -16 : 0;
        return (
          <path
            key={`${from}-${to}`}
            className={emphasis ? 'vp-map-connection-emphasis' : ''}
            d={`M ${start[0]} ${start[1]} Q ${(start[0] + end[0]) / 2} ${(start[1] + end[1]) / 2 + bend} ${end[0]} ${end[1]}`}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

export function VisualPrototypeMap({
  variant,
  onSelect,
  onSelectObject,
}: {
  variant: Variant;
  onSelect: () => void;
  onSelectObject?: (object: { id: string; name: string; type: string }, anchor: DOMRect) => void;
}) {
  const points = positions[variant];
  return (
    <section
      className={`vp-map vp-map-${variant}`}
      aria-label="Illustrerad rumslig skiss av hushållets karta, med påhittade personer och uppgifter."
    >
      <div className="vp-map-orbit vp-map-orbit-one" aria-hidden="true" />
      <div className="vp-map-orbit vp-map-orbit-two" aria-hidden="true" />
      <Connections points={points} />
      <Connections points={compactPositions} compact />
      {connections.map(({ from, to, label, at, compactAt, secondary, emphasis }) => (
        <span
          key={`${from}-${to}`}
          className={`vp-map-relationship${secondary ? ' vp-map-relationship-secondary' : ''}${emphasis ? ' vp-map-relationship-emphasis' : ''}`}
          style={positionStyle(at, compactAt)}
          aria-hidden="true"
        >
          {label}
        </span>
      ))}
      {objects.map(({ id, name, type, icon }) => {
        const content = (
          <>
            <span className={`vp-map-glyph vp-map-glyph-${id}`} aria-hidden="true">
              {typeof icon === 'string' ? (
                icon
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {icon}
                </svg>
              )}
            </span>
            <span className="vp-map-node-copy">
              <span className="vp-map-node-type">{type}</span>
              <strong>{name}</strong>
              {id === 'subscription' && (
                <span className="vp-map-node-price">
                  189 kr <span>/ månad</span>
                </span>
              )}
            </span>
            {id === 'subscription' && (
              <span className="vp-map-node-open" aria-hidden="true">
                ↗
              </span>
            )}
          </>
        );
        const className = `vp-map-node vp-map-node-${id}${id === 'subscription' ? ' vp-map-node-selected' : ''}`;
        return id === 'subscription' || onSelectObject ? (
          <button
            key={id}
            type="button"
            className={className}
            style={positionStyle(points[id], compactPositions[id])}
            onClick={(event) => {
              if (onSelectObject) {
                onSelectObject({ id, name, type }, event.currentTarget.getBoundingClientRect());
              } else {
                onSelect();
              }
            }}
            aria-label={
              id === 'subscription'
                ? 'Visa Familjeabonnemang, 189 kronor per månad'
                : `Visa ${name}`
            }
          >
            {content}
          </button>
        ) : (
          <div
            key={id}
            className={className}
            style={positionStyle(points[id], compactPositions[id])}
          >
            {content}
          </div>
        );
      })}
      <p className="vp-map-accessible-description">
        Alex står på familjeabonnemanget. Abonnemanget ger tillgång till Musikgläntan och betalas
        från ett gemensamt bankkonto. Lo använder Musikgläntan. Alex använder ett eget tjänstekonto
        med en inloggningsadress. Ett betalkort är kopplat till bankkontot.
      </p>
      <div className="vp-map-axis" aria-hidden="true">
        <span /> <span /> <span />
      </div>
    </section>
  );
}
