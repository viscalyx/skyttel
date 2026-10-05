import { useId, useLayoutEffect, useRef, useState } from 'react';
import {
  draftChangeCount,
  type MapState,
  proposedObjectTypes,
  proposedRelationshipTypes,
} from '../shared/map.js';
import { ConversationDraft } from './ConversationDraft.js';
import { DraftProposalDetails, draftProposals } from './DraftProposalDetails.js';
import { trapDialogTab } from './modal-focus.js';
import { WorkspaceIcon } from './WorkspaceTools.js';
import './draft-review.css';

export function draftWarnings(state: MapState) {
  const warnings: Record<string, string> = {};
  const objectTypes = proposedObjectTypes(state.types, state.draft.objectTypes);
  const relationshipTypes = proposedRelationshipTypes(
    state.relationshipTypes,
    state.draft.relationshipTypes,
  );
  for (const change of state.draft.changes) {
    if (change.after?.identity === 'unresolved')
      warnings[`object-${change.id}`] =
        'Identiteten är olöst. Rätta objektet i det ordinarie flödet.';
    if (change.after && !objectTypes.some((type) => type.id === change.after?.typeId))
      warnings[`object-${change.id}`] = 'Objekttypen saknas. Rätta objektet eller typen.';
  }
  for (const change of state.draft.relationships ?? []) {
    if (change.after?.knowledge === 'unresolved')
      warnings[`relationship-${change.id}`] =
        'Målet är oklart. Rätta sambandet i det ordinarie flödet.';
    if (change.after && !relationshipTypes.some((type) => type.id === change.after?.typeId))
      warnings[`relationship-${change.id}`] = 'Sambandstypen saknas. Rätta sambandet eller typen.';
  }
  return warnings;
}
/** Read-only review; removal and saving are supplied by the household work owner. */
export function DraftReview({
  state,
  onRemove,
  onDiscard,
  onSave,
  blocked = false,
}: {
  state: MapState;
  onRemove?: (key: string) => void;
  onDiscard?: () => void;
  onSave?: () => void;
  blocked?: boolean;
}) {
  const [readKey, setReadKey] = useState<string | null>(null);
  const proposals = draftProposals(state.draft);
  const read = proposals.find((proposal) => proposal.key === readKey);
  const visibleReadKey = read?.key;
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const draftHeading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);
  const previousKeys = useRef<string[]>([]);
  const latestProposals = useRef(proposals);
  latestProposals.current = proposals;
  const warnings = draftWarnings(state);
  useLayoutEffect(() => {
    if (!visibleReadKey) {
      if (readKey) setReadKey(null);
      return;
    }
    dialog.current?.showModal();
    heading.current?.focus();
    return () => {
      dialog.current?.close();
      const origin = opener.current;
      if (origin?.isConnected && !origin.matches(':disabled') && origin.getClientRects().length)
        origin.focus();
      else {
        const index = previousKeys.current.indexOf(visibleReadKey);
        const nextKeys = previousKeys.current
          .slice(index + 1)
          .concat(previousKeys.current.slice(0, index).reverse());
        const fallback = nextKeys
          .map((key) => latestProposals.current.find((item) => item.key === key))
          .find(Boolean);
        const button = fallback ? document.getElementById(`draft-read-${fallback.key}`) : null;
        if (button?.getClientRects().length) button.focus();
        else draftHeading.current?.focus();
      }
    };
    // The open proposal is updated in place; new data must not reset its focus.
  }, [visibleReadKey, readKey]);
  return (
    <div className="draft-review-main">
      <header className="draft-review-heading">
        <h3 ref={draftHeading} tabIndex={-1} id="text-draft-title">
          Utkast
        </h3>
        <div className="draft-heading-actions">
          <button
            type="button"
            className="draft-icon"
            aria-label="Spara hela utkastet"
            title="Spara hela utkastet"
            disabled={blocked || !draftChangeCount(state.draft) || !onSave}
            onClick={onSave}
          >
            <WorkspaceIcon name="save" />
          </button>
          <button
            type="button"
            className="draft-icon draft-remove"
            aria-label="Kasta hela utkastet"
            title="Kasta hela utkastet"
            disabled={blocked || !draftChangeCount(state.draft) || !onDiscard}
            onClick={onDiscard}
          >
            <WorkspaceIcon name="trash" />
          </button>
        </div>
      </header>
      <ConversationDraft
        draft={state.draft}
        blocked={blocked}
        onRemove={onRemove}
        warnings={warnings}
        onOpen={(key) => {
          opener.current = document.getElementById(`draft-read-${key}`);
          previousKeys.current = proposals.map((proposal) => proposal.key);
          setReadKey(key);
        }}
      />
      {!!Object.keys(warnings).length && <p>Rätta markerade förslag innan du sparar.</p>}
      {read && (
        <dialog
          ref={dialog}
          className="draft-read-modal"
          aria-labelledby={titleId}
          onKeyDown={trapDialogTab}
          onCancel={(event) => {
            event.preventDefault();
            setReadKey(null);
          }}
        >
          <header>
            <h2 ref={heading} tabIndex={-1} id={titleId}>
              {read.name}
            </h2>
            <button
              type="button"
              aria-label="Stäng dialogen"
              title="Stäng dialogen"
              onClick={() => setReadKey(null)}
            >
              <WorkspaceIcon name="close" />
            </button>
          </header>
          <div className="draft-read-body">
            <DraftProposalDetails proposal={read} />
          </div>
        </dialog>
      )}
    </div>
  );
}
