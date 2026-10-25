// Throwaway: coordinate entry beside the existing Navigation movement buttons.
import { createContext, useContext, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Position } from '../shared/personal-view.js';
import type { usePersonalView } from './use-personal-view.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './position.prototype.css';

type Personal = ReturnType<typeof usePersonalView>;
type Prototype = { personal: Personal };
export const PositionPrototypeContext = createContext<Prototype | null>(null);
const axes = [
  ['x', 'Sidled (X)'],
  ['y', 'Höjd (Y)'],
  ['z', 'Djup (Z)'],
] as const;
const coordinateFormat = new Intl.NumberFormat('en-US', {
  useGrouping: false,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function roundedCoordinate(value: number) {
  const rounded = Number(coordinateFormat.format(value));
  return rounded === 0 ? 0 : rounded;
}
function coordinateText(value: number) {
  return coordinateFormat.format(roundedCoordinate(value));
}
function number(value: number) {
  return value.toLocaleString('sv-SE', { maximumFractionDigits: 2, signDisplay: 'exceptZero' });
}
function describe(position: Position) {
  return axes.map(([axis, name]) => `${name}: ${number(position[axis])}`).join(', ');
}

export function usePositionPrototype(source: Personal) {
  const [query] = useSearchParams();
  const enabled = import.meta.env.DEV && query.has('prototype-position');
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [message, setMessage] = useState('');
  const view = useMemo(
    () =>
      source.view && {
        ...source.view,
        positions: [
          ...source.view.positions.filter(({ id }) => !positions[id]),
          ...Object.entries(positions).map(([id, value]) => ({ id, version: 0, ...value })),
        ],
      },
    [source.view, positions],
  );
  const personal: Personal = enabled
    ? {
        ...source,
        message: '',
        toast: false,
        pending: false,
        view,
        async move(id, position) {
          const next = Object.fromEntries(
            axes.map(([axis]) => [axis, Math.max(-10000, Math.min(10000, position[axis]))]),
          ) as Position;
          setPositions((previous) => ({ ...previous, [id]: next }));
          setMessage(`Position i din vy: ${describe(next)}. Ändringen sparas inte i prototypen.`);
        },
      }
    : source;
  return {
    personal,
    context: enabled ? { personal } : null,
    switcher: enabled && (
      <aside className="position-prototype-switcher" aria-label="Positionsprototyp">
        <p>Prototyp · Markera ett objekt → Navigera → Ange position.</p>
        <p>Positioner sparas inte.</p>
        <p className="visually-hidden" role="status" aria-live="polite">
          {message}
        </p>
      </aside>
    ),
  };
}

export function PositionPrototype({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled: boolean;
}) {
  const context = useContext(PositionPrototypeContext);
  const heading = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  if (!context) return null;
  const position = context.personal.view?.positions.find((item) => item.id === id);
  return (
    <section className="position-prototype" aria-labelledby={heading}>
      <div className="position-prototype-heading">
        <h4 id={heading}>Ange position</h4>
        <button
          type="button"
          className="position-prototype-info"
          aria-label="Om koordinaterna"
          title="Om koordinaterna"
          aria-expanded={helpOpen}
          aria-controls={`${heading}-help`}
          onClick={() => setHelpOpen(!helpOpen)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && helpOpen) {
              event.preventDefault();
              event.stopPropagation();
              setHelpOpen(false);
            }
          }}
        >
          <WorkspaceIcon name="info" />
        </button>
      </div>
      <div id={`${heading}-help`} className="position-prototype-help" hidden={!helpOpen}>
        <p>
          X är sidled, Y är höjd och Z är djup i kartans fasta axlar. Värdena är inte verkliga mått.
        </p>
        <p>Värden mellan −10 000 och +10 000. Nya värden avrundas till två decimaler.</p>
      </div>
      {!position ? (
        <p>Ingen position finns att visa för detta objekt.</p>
      ) : (
        <fieldset disabled={disabled} className="position-prototype-fields">
          <legend className="visually-hidden">Koordinater för {name}</legend>
          <CoordinateEntry
            key={id}
            position={position}
            onMove={(next) => void context.personal.move(id, next)}
          />
        </fieldset>
      )}
    </section>
  );
}
type EditorProps = { position: Position; onMove: (position: Position) => void };

function CoordinateEntry({ position, onMove }: EditorProps) {
  const [edits, setEdits] = useState<
    Partial<Record<keyof Position, { text: string; position: number }>>
  >({});
  const values = Object.fromEntries(
    axes.map(([axis]) => [
      axis,
      edits[axis]?.position === position[axis] ? edits[axis].text : coordinateText(position[axis]),
    ]),
  ) as Record<keyof Position, string>;
  return (
    <div className="position-prototype-entry">
      <div className="position-prototype-inputs">
        {axes.map(([axis, label]) => (
          <label key={axis}>
            {axis.toUpperCase()}
            <input
              aria-label={label}
              type="number"
              step="any"
              min="-10000"
              max="10000"
              value={values[axis]}
              onChange={(event) => {
                const input = event.currentTarget;
                const value = input.valueAsNumber;
                const valid = input.value !== '' && input.validity.valid && Number.isFinite(value);
                const rounded = valid ? roundedCoordinate(value) : position[axis];
                // Keep partial typing (for example "1.") usable. Excess decimals
                // normalize immediately; leaving the field pads to two decimals.
                const text =
                  valid && (value !== rounded || /\.\d{3,}|[eE]/.test(input.value))
                    ? coordinateText(rounded)
                    : input.value;
                setEdits((previous) => ({
                  ...previous,
                  [axis]: { text, position: rounded },
                }));
                if (valid && rounded !== position[axis]) onMove({ ...position, [axis]: rounded });
              }}
              onBlur={() => setEdits((previous) => ({ ...previous, [axis]: undefined }))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
