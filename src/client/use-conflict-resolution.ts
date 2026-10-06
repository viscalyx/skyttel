import { useRef, useState } from 'react';
import type { PrivateConflictEffect } from '../shared/conflict-effects.js';
import {
  type ConflictChoices,
  type conflictBasis,
  conflictChange,
  sameConflictValue,
} from '../shared/conflict-properties.js';
import { type DraftConflict, draftConflicts } from '../shared/draft-conflicts.js';
import type { MapState } from '../shared/map.js';
import { MapRequestError } from './map-request.js';

export type ConflictResolution = {
  conflict: DraftConflict;
  basis: ReturnType<typeof conflictBasis>;
} & (
  | { choices: ConflictChoices; command?: never }
  | { command: 'discard-proposal'; choices?: never }
  | { command: 'removal-choices'; removalChoices: ConflictChoices; choices?: never }
  | { command: 'definition-choice'; definitionChoice: 'saved' | 'proposed'; choices?: never }
);
export type AppliedConflictResolution = {
  key: string;
  value: Record<string, unknown> | null;
  removed: boolean;
};
type ResolutionRequest = {
  key: string;
  resolution: ConflictResolution;
  value: Record<string, unknown> | null;
  comparison: MapState;
  discard: boolean;
  effects?: PrivateConflictEffect[];
};
function savedMapBasis(state: MapState) {
  const { contentVersion, objects, relationships, types, relationshipTypes } = state;
  return { contentVersion, objects, relationships, types, relationshipTypes };
}
type ResolutionAttempt = Omit<ResolutionRequest, 'comparison'> & {
  version: number;
  savedBasis: ReturnType<typeof savedMapBasis>;
};

function privateOutcomeMessage(removed: boolean) {
  return removed
    ? 'Förslaget har tagits bort ur ditt utkast. Kartan ändras inte av konfliktvalet.'
    : 'Valen finns i ditt utkast. Kartan sparas separat.';
}

/** Owns one private-draft request and verifies its actual effect before permitting another. */
export function useConflictResolution({
  onResolve,
  onRefresh,
  onApplied,
  onStale,
  onStatus,
}: {
  onResolve: (resolution: ConflictResolution) => Promise<void>;
  onRefresh: () => Promise<MapState>;
  onApplied: (result: AppliedConflictResolution) => void;
  onStale: (key: string) => void;
  onStatus: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<ResolutionAttempt | null>(null);
  async function apply(requested: ResolutionRequest) {
    if (lock.current || pending || unknown) return;
    lock.current = true;
    setPending(true);
    onStatus('Lägger valen i ditt utkast…');
    const { comparison, ...action } = requested;
    attempt.current = {
      ...action,
      value: JSON.parse(JSON.stringify(requested.value)),
      version: comparison.draft.version,
      savedBasis: savedMapBasis(comparison),
    };
    try {
      await onResolve(requested.resolution);
      onApplied({ key: requested.key, value: requested.value, removed: requested.discard });
      onStatus(privateOutcomeMessage(requested.discard));
      attempt.current = null;
    } catch (failure) {
      if (failure instanceof MapRequestError && failure.status < 500) {
        attempt.current = null;
        if (failure.status === 409) onStale(requested.key);
        onStatus(
          failure.status === 409
            ? 'Underlaget har ändrats. Visa aktuell jämförelse innan du bekräftar. Dina val finns kvar.'
            : 'Valen kunde inte läggas i utkastet. Dina val finns kvar. Kontrollera kombinationen och försök igen.',
        );
      } else {
        setUnknown(true);
        onStatus(
          'Det är oklart om valen lades i utkastet. Kontrollera utfallet innan du försöker igen.',
        );
      }
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function checkAttempt() {
    const current = attempt.current;
    if (!unknown || !current || lock.current || pending) return;
    lock.current = true;
    setPending(true);
    onStatus('Kontrollerar utkastet…');
    try {
      const latest = await onRefresh();
      const change = conflictChange(latest, current.resolution.conflict);
      const effects: PrivateConflictEffect[] = current.effects ?? [
        {
          target: current.resolution.conflict,
          ...(current.discard
            ? { kind: 'discard' }
            : {
                kind: 'retain',
                before: current.resolution.conflict.current,
                after: current.value,
              }),
        },
      ];
      const applied =
        latest.draft.version > current.version &&
        effects.every((effect) => {
          const proposal = conflictChange(latest, effect.target);
          return effect.kind === 'discard'
            ? !proposal
            : proposal &&
                sameConflictValue(proposal.after, effect.after) &&
                sameConflictValue(proposal.before, effect.before) &&
                (!effect.restoration ||
                  ('restoration' in proposal &&
                    sameConflictValue(proposal.restoration, effect.restoration)));
        });
      const stillConflicted = draftConflicts(latest).some(
        (conflict) =>
          conflict.kind === current.resolution.conflict.kind &&
          conflict.id === current.resolution.conflict.id,
      );
      const sharedChanged = !sameConflictValue(savedMapBasis(latest), current.savedBasis);
      if (!change && sharedChanged) {
        // A shared save can consume the draft too. Absence then proves no private outcome.
        onStatus(
          'Konflikten finns inte längre i aktuellt underlag. Granska ditt aktuella utkast och kartan.',
        );
      } else if (applied && !stillConflicted) {
        onApplied({ key: current.key, value: current.value, removed: current.discard });
        onStatus(privateOutcomeMessage(current.discard));
      } else if (applied || sharedChanged) {
        onStale(current.key);
        onStatus(
          'Utkastet eller underlaget har ändrats. Visa aktuell jämförelse innan ett nytt försök. Dina val finns kvar.',
        );
      } else if (!change) {
        onStatus('Konflikten finns inte längre i aktuellt underlag. Granska ditt aktuella utkast.');
      } else {
        onStatus(
          'Kontrollen visar att valet inte lades i utkastet. Dina val finns kvar. Du kan försöka igen.',
        );
      }
      attempt.current = null;
      setUnknown(false);
    } catch {
      onStatus('Utkastet kunde inte kontrolleras. Utfallet är fortfarande oklart. Försök igen.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return { pending, unknown, apply, check: checkAttempt };
}
