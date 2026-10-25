// Throwaway: compare three position editors on the household route via ?variant=A/B/C.
import { createContext, useContext, useId, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Position } from '../shared/personal-view.js';
import type { usePersonalView } from './use-personal-view.js';
import './position.prototype.css';

type Personal = ReturnType<typeof usePersonalView>;
type Variant = 'A' | 'B' | 'C';
type Prototype = { personal: Personal; variant: Variant };
export const PositionPrototypeContext = createContext<Prototype | null>(null);
const axes = [
  ['x', 'Sidled (X)'],
  ['y', 'Höjd (Y)'],
  ['z', 'Djup (Z)'],
] as const;
const variants: Variant[] = ['A', 'B', 'C'];
const titles = { A: 'Alla axlar', B: 'En axel i taget', C: 'Ange position' };
function number(value: number) {
  return value.toLocaleString('sv-SE', { maximumFractionDigits: 2, signDisplay: 'exceptZero' });
}
function describe(position: Position) {
  return axes.map(([axis, name]) => `${name}: ${number(position[axis])}`).join(', ');
}

export function usePositionPrototype(source: Personal) {
  const [query, setQuery] = useSearchParams();
  const enabled = import.meta.env.DEV && query.has('prototype-position');
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [message, setMessage] = useState('');
  const variant = variants.find((key) => key === query.get('variant')) ?? 'A';
  const personal: Personal = enabled
    ? {
        ...source,
        message: '',
        toast: false,
        pending: false,
        view: source.view && {
          ...source.view,
          positions: [
            ...source.view.positions.filter(({ id }) => !positions[id]),
            ...Object.entries(positions).map(([id, value]) => ({ id, version: 0, ...value })),
          ],
        },
        async move(id, position) {
          const next = Object.fromEntries(
            axes.map(([axis]) => [axis, Math.max(-10000, Math.min(10000, position[axis]))]),
          ) as Position;
          setPositions((previous) => ({ ...previous, [id]: next }));
          setMessage(`Position i din vy: ${describe(next)}. Ändringen sparas inte i prototypen.`);
        },
      }
    : source;
  function cycle(step: number) {
    const next = variants[(variants.indexOf(variant) + step + variants.length) % variants.length];
    setQuery(
      (previous) => {
        previous.set('variant', next);
        return previous;
      },
      { replace: true },
    );
  }
  return {
    personal,
    context: enabled ? { personal, variant } : null,
    switcher: enabled && (
      <aside className="position-prototype-switcher" aria-label="Jämför positionsprototyper">
        <fieldset
          className="position-prototype-switch-row"
          aria-label="Välj prototyp"
          onKeyDown={(event) => {
            if (!(event.target instanceof HTMLButtonElement)) return;
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            event.stopPropagation();
            cycle(event.key === 'ArrowLeft' ? -1 : 1);
          }}
        >
          <button type="button" aria-label="Föregående prototyp" onClick={() => cycle(-1)}>
            ←
          </button>
          <span>
            Prototyp {variant} · {titles[variant]}
          </span>
          <button type="button" aria-label="Nästa prototyp" onClick={() => cycle(1)}>
            →
          </button>
        </fieldset>
        <p>Öppna Tabell → välj ett objektnamn. Positioner sparas inte.</p>
        <p className="visually-hidden" role="status" aria-live="polite">
          {message}
        </p>
      </aside>
    ),
  };
}

export function PositionPrototype({ id, name }: { id: string; name: string }) {
  const context = useContext(PositionPrototypeContext);
  const heading = useId();
  if (!context) return null;
  const position = context.personal.view?.positions.find((item) => item.id === id);
  return (
    <section className="position-prototype" aria-labelledby={heading}>
      <h4 id={heading}>Position i din vy</h4>
      <p>
        Sidled, höjd och djup följer kartans fasta axlar, även när du roterar vyn. Noll är kartans
        fasta nollpunkt. Värdena är inte verkliga mått.
      </p>
      {!position ? (
        <p>Ingen position finns att visa för detta objekt.</p>
      ) : (
        <>
          <p className="position-prototype-summary" data-position-object={id}>
            {describe(position)}
          </p>
          <p className="position-prototype-help">
            Minus och plus anger sida om noll. 0 ligger på nollplanet. Värden visas avrundade till
            två decimaler; små värden kan visas som 0.
          </p>
          {context.variant === 'A' && (
            <VariantA position={position} onMove={(next) => void context.personal.move(id, next)} />
          )}
          {context.variant === 'B' && (
            <VariantB position={position} onMove={(next) => void context.personal.move(id, next)} />
          )}
          {context.variant === 'C' && (
            <VariantC
              key={id}
              position={position}
              onMove={(next) => void context.personal.move(id, next)}
            />
          )}
          <small>Prototyp · {name} · bara denna flik. Ladda om för att börja om.</small>
        </>
      )}
    </section>
  );
}
type EditorProps = { position: Position; onMove: (position: Position) => void };

export function VariantA({ position, onMove }: EditorProps) {
  return (
    <div className="position-prototype-rows">
      {axes.map(([axis, label]) => (
        <div className="position-prototype-axis" key={axis}>
          <strong>{label}</strong>
          <span>{number(position[axis])}</span>
          <button
            type="button"
            aria-label={`Minska ${label} med 1`}
            onClick={() => onMove({ ...position, [axis]: position[axis] - 1 })}
          >
            −1
          </button>
          <button
            type="button"
            aria-label={`Öka ${label} med 1`}
            onClick={() => onMove({ ...position, [axis]: position[axis] + 1 })}
          >
            +1
          </button>
        </div>
      ))}
    </div>
  );
}

export function VariantB({ position, onMove }: EditorProps) {
  const [axis, setAxis] = useState<keyof Position>('x');
  return (
    <div className="position-prototype-stepper">
      <label>
        Välj axel
        <select value={axis} onChange={(event) => setAxis(event.target.value as keyof Position)}>
          {axes.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>
        Aktuell position: <strong>{number(position[axis])}</strong>
      </p>
      <div className="position-prototype-pair">
        <button type="button" onClick={() => onMove({ ...position, [axis]: position[axis] - 1 })}>
          Minska med 1
        </button>
        <button type="button" onClick={() => onMove({ ...position, [axis]: position[axis] + 1 })}>
          Öka med 1
        </button>
      </div>
    </div>
  );
}

export function VariantC({ position, onMove }: EditorProps) {
  const [edits, setEdits] = useState<Partial<Record<keyof Position, string>>>({});
  const values = Object.fromEntries(
    axes.map(([axis]) => [axis, edits[axis] ?? String(position[axis])]),
  ) as Record<keyof Position, string>;
  const valid = axes.every(
    ([axis]) =>
      values[axis].trim() !== '' &&
      Number.isFinite(Number(values[axis])) &&
      Math.abs(Number(values[axis])) <= 10000,
  );
  return (
    <div className="position-prototype-entry">
      <div className="position-prototype-inputs">
        {axes.map(([axis, label]) => (
          <label key={axis}>
            {label}
            <input
              type="number"
              step="any"
              min="-10000"
              max="10000"
              value={values[axis]}
              onChange={(event) =>
                setEdits((previous) => ({ ...previous, [axis]: event.target.value }))
              }
            />
          </label>
        ))}
      </div>
      <p>Skriv ett värde mellan −10 000 och +10 000 för varje axel.</p>
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          onMove({ x: Number(values.x), y: Number(values.y), z: Number(values.z) });
          setEdits({});
        }}
      >
        Flytta till angiven position
      </button>
    </div>
  );
}
