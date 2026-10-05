import { useId } from 'react';
import { type HistorySelection, MapHistory } from './MapHistory.js';
import './reports.css';

export function Reports({
  active,
  path,
  version,
  selection,
  onSelect,
  onAccessLost,
  onReturn,
}: {
  active: boolean;
  path: string;
  version: number;
  selection?: HistorySelection;
  onSelect: (selection: HistorySelection, href: string) => void;
  onAccessLost: () => void;
  onReturn: () => void;
}) {
  const id = useId();
  return (
    <section className="household-reports" aria-label="Rapporter" hidden={!active}>
      <header>
        <h1>Rapporter</h1>
        <button type="button" onClick={onReturn}>
          Tillbaka till arbetet
        </button>
      </header>
      <div role="tablist" aria-label="Rapporter">
        <button
          type="button"
          role="tab"
          id={`${id}-tab`}
          aria-selected="true"
          aria-controls={`${id}-panel`}
        >
          Ändringshistorik
        </button>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab`}>
        <MapHistory
          active={active}
          path={path}
          version={version}
          selection={selection}
          onSelect={onSelect}
          onAccessLost={onAccessLost}
        />
      </div>
    </section>
  );
}
