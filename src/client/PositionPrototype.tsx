// Throwaway: coordinate entry beside the existing Navigation movement buttons.
import { createContext, useContext, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Position } from '../shared/personal-view.js';
import type { usePersonalView } from './use-personal-view.js';
import './position.prototype.css';

type Personal = ReturnType<typeof usePersonalView>;
type Prototype = { personal: Personal };
export const PositionPrototypeContext = createContext<Prototype | null>(null);
const axes = [
  ['x', 'Sidled (X)'],
  ['y', 'Höjd (Y)'],
  ['z', 'Djup (Z)'],
] as const;
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
  if (!context) return null;
  const position = context.personal.view?.positions.find((item) => item.id === id);
  return (
    <section className="position-prototype" aria-labelledby={heading}>
      <h4 id={heading}>Ange position</h4>
      {!position ? (
        <p>Ingen position finns att visa för detta objekt.</p>
      ) : (
        <>
          <fieldset disabled={disabled} className="position-prototype-fields">
            <legend className="visually-hidden">Koordinater för {name}</legend>
            <CoordinateEntry
              key={id}
              position={position}
              onMove={(next) => void context.personal.move(id, next)}
            />
          </fieldset>
          <details className="position-prototype-help">
            <summary>Om koordinaterna</summary>
            <p>
              X är sidled, Y är höjd och Z är djup i kartans fasta axlar. Nollpunkten ligger kvar
              när du roterar vyn. Värdena är inte verkliga mått.
            </p>
            <p className="position-prototype-summary" data-position-object={id}>
              Aktuell position (avrundad): {describe(position)}
            </p>
            <p>Värden mellan −10 000 och +10 000. Prototypens ändringar sparas inte.</p>
          </details>
        </>
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
      edits[axis]?.position === position[axis] ? edits[axis].text : String(position[axis]),
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
                setEdits((previous) => ({
                  ...previous,
                  [axis]: { text: input.value, position: valid ? value : position[axis] },
                }));
                if (valid && value !== position[axis]) onMove({ ...position, [axis]: value });
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
