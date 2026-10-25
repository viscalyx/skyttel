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
}: {
  value: PlaneComparison;
  onChange: (value: PlaneComparison) => void;
}) {
  return (
    <details className="zero-planes-prototype" open>
      <summary>Prototyp · tre nollplan</summary>
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
      </div>
      <p role="status">
        {{ square: 'Kvadrat', oval: 'Oval', circle: 'Cirkel' }[value.shape]} ·{' '}
        {{ subtle: 'Diskret', original: 'Ursprunglig', prominent: 'Framträdande' }[value.weight]} ·
        alla tre plan
      </p>
      <p>XZ: heldragen · YZ: streckad · XY: prickad.</p>
      <p>
        Provisorisk utbredning:{' '}
        {
          { square: '±27 × ±27 vysteg', oval: '±27 × ±18,9 vysteg', circle: 'radie 27 vysteg' }[
            value.shape
          ]
        }
        . Fast centrum (0, 0, 0); följer inte kameran. Valen sparas inte.
      </p>
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
      {prototypePlanes.map((plane, index) => {
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
