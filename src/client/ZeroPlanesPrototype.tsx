import './zero-planes.prototype.css';
import type { Position } from '../shared/personal-view.js';
import {
  type PlaneComparison,
  prototypePlaneExtent,
  prototypePlanePoint,
  prototypePlanes,
} from './zero-planes.prototype.js';

export function ZeroPlanesPrototypeControls({
  value,
  onChange,
  probe,
}: {
  value: PlaneComparison;
  onChange: (value: PlaneComparison) => void;
  probe?: { position: Position; move: (position: Position) => void };
}) {
  return (
    <details className="zero-planes-prototype" open>
      <summary>Prototyp · nollreferenser</summary>
      <div className="zero-planes-prototype-choices">
        <label>
          Form
          <select
            value={value.shape}
            onChange={(event) =>
              onChange({ ...value, shape: event.target.value as PlaneComparison['shape'] })
            }
          >
            <option value="square">Kvadrat</option>
            <option value="oval">Oval</option>
            <option value="circle">Cirkel</option>
            <option value="lines">Linjer</option>
          </select>
        </label>
        <label>
          Visuell styrka
          <select
            value={value.weight}
            onChange={(event) =>
              onChange({ ...value, weight: event.target.value as PlaneComparison['weight'] })
            }
          >
            <option value="subtle">Diskret</option>
            <option value="original">Ursprunglig</option>
            <option value="prominent">Framträdande</option>
          </select>
        </label>
        <label>
          Djupvisning
          <select
            value={value.depth ?? 'overlay'}
            onChange={(event) =>
              onChange({ ...value, depth: event.target.value as PlaneComparison['depth'] })
            }
          >
            <option value="overlay">A · Alltid framför</option>
            <option value="tint">B · Ton bakom plan</option>
            <option value="strong">C · Stark ton bakom plan</option>
          </select>
        </label>
      </div>
      {value.depth === 'strong' && (
        <label>
          Tonstyrka: {Math.round((value.depthStrength ?? 0.6) * 100)} %
          <input
            type="range"
            aria-label="Tonstyrka"
            min="0"
            max="0.85"
            step="0.05"
            value={value.depthStrength ?? 0.6}
            onChange={(event) => onChange({ ...value, depthStrength: Number(event.target.value) })}
          />
        </label>
      )}
      <p role="status">
        {{ square: 'Kvadrat', oval: 'Oval', circle: 'Cirkel', lines: 'Linjer' }[value.shape]} ·{' '}
        {{ subtle: 'Diskret', original: 'Ursprunglig', prominent: 'Framträdande' }[value.weight]} ·
        {value.shape === 'lines' ? 'tre axlar, sex riktningar' : 'alla tre plan'} ·{' '}
        {
          {
            overlay: 'A · Alltid framför',
            tint: 'B · Ton bakom plan',
            strong: 'C · Stark ton bakom plan',
          }[value.depth ?? 'overlay']
        }
      </p>
      <p>
        B och C färgar de delar av objektsymboler och samband som ligger bakom en planyta. Namn och
        texter påverkas inte. Linjer saknar planytor och får ingen ton.
      </p>
      <p>
        {value.shape === 'lines'
          ? 'X: bredd · Y: höjd · Z: djup. Inga planytor eller rutnät.'
          : 'XZ: heldragen · YZ: streckad · XY: prickad.'}
      </p>
      <p>
        Provisorisk utbredning:{' '}
        {
          {
            square: '±27 × ±27 vysteg',
            oval: '±27 × ±18,9 vysteg',
            circle: 'radie 27 vysteg',
            lines: '±27 vysteg längs varje axel',
          }[value.shape]
        }
        . Fast centrum (0, 0, 0); följer inte kameran. Valen sparas inte.
      </p>
      {probe && (
        <fieldset>
          <legend>Flytta Provobjekt 00 genom planen</legend>
          <p>Endast i denna visning. Ladda om för att återställa.</p>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <label key={axis}>
              {axis.toUpperCase()}: {probe.position[axis].toFixed(1)}
              <input
                type="range"
                aria-label={`Provobjekt 00 ${axis.toUpperCase()}`}
                min="-12"
                max="12"
                step="0.25"
                value={probe.position[axis]}
                onChange={(event) =>
                  probe.move({ ...probe.position, [axis]: Number(event.target.value) })
                }
              />
            </label>
          ))}
        </fieldset>
      )}
    </details>
  );
}

export function ZeroPlanesPrototypeLabels({
  project,
  theme,
  value,
}: {
  project: (point: Position) => { x: number; y: number; visible: boolean } | undefined;
  theme: 'light' | 'dark';
  value: PlaneComparison;
}) {
  const origin = project({ x: 0, y: 0, z: 0 });
  const extent = prototypePlaneExtent;
  return (
    <g
      className="zero-planes-prototype-labels"
      pointerEvents="none"
      fontSize="12"
      stroke={theme === 'dark' ? '#101b29' : '#eef3f3'}
      strokeWidth="4"
      paintOrder="stroke"
      strokeLinejoin="round"
    >
      {value.shape === 'lines'
        ? ['X', 'Y', 'Z'].flatMap((name, index) =>
            [-1, 1].map((sign) => {
              const point = project({
                x: index === 0 ? sign * extent * 0.92 : 0,
                y: index === 1 ? sign * extent * 0.92 : 0,
                z: index === 2 ? sign * extent * 0.92 : 0,
              });
              return (
                point?.visible && (
                  <text
                    key={`${name}${sign}`}
                    x={point.x + 6}
                    y={point.y - 6}
                    fill={theme === 'dark' ? '#c3d4df' : '#405664'}
                  >
                    {sign < 0 ? '−' : '+'}
                    {name}
                  </text>
                )
              );
            }),
          )
        : prototypePlanes.map((plane, index) => {
            const position = project(
              prototypePlanePoint(
                index,
                extent * 0.76,
                (value.shape === 'oval' ? 0.25 : 0.62) * extent,
              ),
            );
            return (
              position?.visible && (
                <text key={plane.name} x={position.x} y={position.y} fill={plane[theme]}>
                  {plane.name}
                </text>
              )
            );
          })}
      {origin?.visible && (
        <g fill={theme === 'dark' ? '#f0f6fa' : '#183344'}>
          <circle cx={origin.x} cy={origin.y} r="3" />
          <text x={origin.x + 9} y={origin.y - 9}>
            0
          </text>
        </g>
      )}
    </g>
  );
}
