import { type ReactNode, useEffect, useState } from 'react';
import { type AdminModel, AdminOperation, type AdminVariant, adminNames } from './AdminStudy.js';
import type { NavPage } from './NavigationPrototypePages.js';

export function AdminStudyLab({
  model,
  variant,
  onVariant,
  role,
  onRole,
  onScenario,
  go,
  panel,
  scenario,
  children,
}: {
  model: AdminModel;
  variant: AdminVariant;
  onVariant: (variant: AdminVariant) => void;
  role: string;
  onRole: (role: string) => void;
  onScenario: (scenario: string) => void;
  go: (page: NavPage) => void;
  panel: string | null;
  scenario: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const cycle = (direction: number) =>
    onVariant(
      (['A', 'B', 'C', 'D'] as const)[(['A', 'B', 'C', 'D'].indexOf(variant) + direction + 4) % 4],
    );
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      // Piltangenter tillhör också kartan, knappar, flikar och listor.
      if (
        target.closest(
          'input, textarea, select, button, [contenteditable], [role], canvas, .np-workspace, .vp-map',
        )
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        cycle(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <aside className="ad-lab" aria-label="Administrationsprototypens provverktyg">
      <div className="ad-switcher">
        <button
          type="button"
          disabled={model.busy}
          aria-label="Föregående utformning"
          onClick={() => cycle(-1)}
        >
          ←
        </button>
        <span>
          <small>Kastbar prototyp</small>
          <strong>
            {variant} · {adminNames[variant]}
          </strong>
        </span>
        <button
          type="button"
          disabled={model.busy}
          aria-label="Nästa utformning"
          onClick={() => cycle(1)}
        >
          →
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="ad-lab-panel"
          onClick={() => setOpen(!open)}
        >
          Provlägen
        </button>
      </div>
      {open && (
        <section id="ad-lab-panel" className="ad-lab-panel">
          <h2>Pröva hela vägen</h2>
          <p>
            Påhittade uppgifter. Tal, inloggning och alla resultat är simulerade. Omladdning
            nollställer provet.
          </p>
          <label>
            Behörighet
            <select value={role} onChange={(e) => onRole(e.target.value)}>
              <option value="member">Medlem</option>
              <option value="administrator">Administratör</option>
              <option value="operator">Driftansvarig och medlem</option>
              <option value="administrator-operator">Administratör och driftansvarig</option>
            </select>
          </label>
          <label>
            Situation
            <select value={scenario} onChange={(e) => onScenario(e.target.value)}>
              <option value="normal">Hushållets karta</option>
              <option value="signin">Inloggning</option>
              <option value="setup">Första administratören</option>
              <option value="access">Saknad eller återkallad tillgång</option>
              <option value="empty">Tom karta och första vägledningen</option>
            </select>
          </label>
          <label>
            Nästa simulerade svar
            <select
              value={model.outcome}
              onChange={(e) => model.setOutcome(e.target.value as AdminModel['outcome'])}
            >
              <option value="done">Lyckas</option>
              <option value="unknown">Svaret försvinner</option>
              <option value="failed">Misslyckas / medgivande nekas</option>
              <option value="stale">Underlaget ändras / verifiering går ut</option>
              <option value="cleanup">Import/radering väntar på rensning</option>
            </select>
          </label>
          <label>
            Extern klients begäran
            <select
              disabled={model.busy}
              value={model.values.consentRequest || 'read'}
              onChange={(event) => {
                model.value('consentRequest', event.target.value);
                model.value('consentWork', '');
              }}
            >
              <option value="read">Läsåtkomst</option>
              <option value="work">Kartarbete</option>
            </select>
          </label>
          <div className="ad-actions">
            <button
              type="button"
              onClick={() => {
                go('settings');
                setOpen(false);
              }}
            >
              Inställningar
            </button>
            <button
              type="button"
              onClick={() => {
                go('members');
                setOpen(false);
              }}
            >
              Inbjudningsguide
            </button>
            <button
              type="button"
              onClick={() => {
                go('import');
                setOpen(false);
              }}
            >
              Återimport
            </button>
            <button
              type="button"
              onClick={() => {
                go('erasure');
                setOpen(false);
              }}
            >
              Permanent radering
            </button>
            <button
              type="button"
              onClick={() => {
                go('costs');
                setOpen(false);
              }}
            >
              Kostnader
            </button>
          </div>
          {children}
          <p className="ad-lab-state">
            Utformning {variant} · vy {panel || 'karta'} · {role} · {scenario}
            <br />
            {model.operation
              ? `Försök ${model.operation.attempt}: ${model.operation.page} / ${model.operation.phase}`
              : 'Ingen åtgärd pågår'}
          </p>
          <p>
            Prova även en annan roll eller förlorad tillgång medan en åtgärd pågår. Inbjudningskoden
            i mottagarprovet är PROV-LIND-4826.
          </p>
        </section>
      )}
      {model.operation &&
        model.operation.page !== panel &&
        !open &&
        ['normal', 'empty'].includes(scenario) && (
          <div className="ad-global-status">
            <AdminOperation model={model} go={go} />
          </div>
        )}
    </aside>
  );
}
