import { conflictChange } from './conflict-properties.js';
import type { DraftConflict } from './draft-conflicts.js';
import type { MapState } from './map.js';

export type SpecialConflict = {
  kind: 'removed';
  reason: string;
  warning: string;
  action: 'Acceptera borttagningen och kasta ditt förslag';
};

/** A missing saved record differs from a proposal that has never been saved. */
export function specialConflict(state: MapState, conflict: DraftConflict): SpecialConflict | null {
  const change = conflictChange(state, conflict);
  if (
    (conflict.kind === 'object' || conflict.kind === 'relationship') &&
    change?.before &&
    !conflict.current
  ) {
    const object = conflict.kind === 'object';
    return {
      kind: 'removed',
      reason: object
        ? 'Objektet togs bort från den gemensamma kartan medan du redigerade det.'
        : 'Sambandet togs bort från den gemensamma kartan medan du redigerade det.',
      warning: object
        ? 'Objektet är borttaget. Ditt ändringsförslag kan inte återställa det.'
        : 'Ett ändringsförslag kan inte återställa ett borttaget samband.',
      action: 'Acceptera borttagningen och kasta ditt förslag',
    };
  }
  return null;
}
